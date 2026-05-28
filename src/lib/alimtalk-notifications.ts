import { sendAlimtalkMessage, buildAlimtalkVariables } from './solapi';

export type ApplicantForNotification = {
  id: string;
  nickname?: string | null;
  aid?: string | null;
  email?: string | null;
  phone?: string | null;
  blog_url?: string | null;
  class_type?: string | null;
  writing_goal?: number | null;
  personal_goal?: number | null;
  is_overseas_resident?: boolean | null;
};

type MessageTemplate = {
  solapi_template_code: string | null;
  variables: unknown;
  name: string | null;
  title: string | null;
};

// /admin/messages에서 관리하는 템플릿 코드 — 변경 시 여기만 수정
const PAYMENT_REQUEST_TEMPLATE_CODE = 'KA01TP260401002645205Rq7guq4A6vd';
const PAYMENT_COMPLETE_TEMPLATE_CODE = 'KA01TP2604010058326342RP6lMyhimH';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchActiveAlimtalkTemplates(supabase: any): Promise<MessageTemplate[]> {
  const { data, error } = await supabase
    .from('message_templates')
    .select('solapi_template_code, variables, name, title')
    .eq('channel', 'alimtalk')
    .eq('is_active', true)
    .not('solapi_template_code', 'is', null)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[alimtalk] 템플릿 조회 오류:', error.message);
    return [];
  }

  console.log(
    '[alimtalk] 활성 알림톡 템플릿 목록:',
    (data ?? []).map((t: MessageTemplate) => ({
      name: t.name,
      title: t.title,
      code: t.solapi_template_code,
    }))
  );

  return data ?? [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPaymentRequestTemplate(supabase: any): Promise<MessageTemplate | null> {
  const templates = await fetchActiveAlimtalkTemplates(supabase);

  if (templates.length === 0) {
    console.warn('[alimtalk] 입금 요청 템플릿을 찾을 수 없습니다');
    return null;
  }

  // 1순위: solapi_template_code 정확히 일치
  const byCode = templates.find(
    (t) => t.solapi_template_code === PAYMENT_REQUEST_TEMPLATE_CODE
  );

  // 2순위: name이 정확히 "입금 요청 메시지"
  const byName = templates.find(
    (t) => t.name === '입금 요청 메시지' || t.title === '입금 요청 메시지'
  );

  const selected = byCode ?? byName ?? null;

  if (!selected) {
    console.warn('[alimtalk] 입금 요청 템플릿을 찾을 수 없습니다');
    return null;
  }

  // 안전 검사: 입금 완료 템플릿이 잘못 선택된 경우 차단
  const selectedName = selected.name ?? selected.title ?? '';
  if (
    selected.solapi_template_code === PAYMENT_COMPLETE_TEMPLATE_CODE ||
    selectedName.includes('입금 완료')
  ) {
    console.error(
      '[alimtalk] 입금 요청 템플릿 조회 오류: 입금 완료 템플릿이 선택됨 — 발송 중단',
      { name: selected.name, code: selected.solapi_template_code }
    );
    return null;
  }

  const templateName = selected.name ?? selected.title ?? '(이름 없음)';
  const templateCode = selected.solapi_template_code;
  console.log('[alimtalk] 입금 요청 템플릿 선택:', { templateName, templateCode });

  return selected;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPaymentCompleteTemplate(supabase: any): Promise<MessageTemplate | null> {
  const templates = await fetchActiveAlimtalkTemplates(supabase);

  if (templates.length === 0) {
    console.warn('[alimtalk] 입금 완료 템플릿을 찾을 수 없습니다');
    return null;
  }

  // 1순위: solapi_template_code 정확히 일치
  const byCode = templates.find(
    (t) => t.solapi_template_code === PAYMENT_COMPLETE_TEMPLATE_CODE
  );

  // 2순위: name이 정확히 "입금 완료 메시지"
  const byName = templates.find(
    (t) => t.name === '입금 완료 메시지' || t.title === '입금 완료 메시지'
  );

  const selected = byCode ?? byName ?? null;

  if (!selected) {
    console.warn('[alimtalk] 입금 완료 템플릿을 찾을 수 없습니다');
    return null;
  }

  // 안전 검사: 입금 요청 템플릿이 잘못 선택된 경우 차단
  const selectedName = selected.name ?? selected.title ?? '';
  if (
    selected.solapi_template_code === PAYMENT_REQUEST_TEMPLATE_CODE ||
    selectedName.includes('입금 요청')
  ) {
    console.error(
      '[alimtalk] 입금 완료 템플릿 조회 오류: 입금 요청 템플릿이 선택됨 — 발송 중단',
      { name: selected.name, code: selected.solapi_template_code }
    );
    return null;
  }

  const templateName = selected.name ?? selected.title ?? '(이름 없음)';
  const templateCode = selected.solapi_template_code;
  console.log('[alimtalk] 입금 완료 템플릿 선택:', { templateName, templateCode });

  return selected;
}

export async function sendPaymentRequestAlimtalk(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  applicant: ApplicantForNotification
): Promise<void> {
  const phone = applicant.phone;
  if (!phone) {
    console.warn(`[alimtalk] 입금 요청 알림톡: 수신자 전화번호 없음 (id=${applicant.id})`);
    return;
  }

  const template = await getPaymentRequestTemplate(supabase);

  if (!template || !template.solapi_template_code) {
    return;
  }

  const variables = buildAlimtalkVariables(template.variables, {
    name: applicant.nickname ?? undefined,
    nickname: applicant.nickname ?? undefined,
    aid: applicant.aid ?? undefined,
    email: applicant.email ?? undefined,
    phone,
    blog_url: applicant.blog_url ?? undefined,
    class_type: applicant.class_type ?? undefined,
    writing_goal: applicant.writing_goal ?? undefined,
    personal_goal: applicant.personal_goal ?? undefined,
    is_overseas_resident: applicant.is_overseas_resident ?? undefined,
  });

  await sendAlimtalkMessage({
    to: phone,
    templateId: String(template.solapi_template_code),
    variables,
  });

  const maskedPhone = phone.replace(/\D/g, '').replace(/^(\d{3})\d+(\d{4})$/, '$1****$2');
  console.log(`[alimtalk] 입금 요청 발송 성공: ${maskedPhone}`);
}

export async function sendPaymentCompleteAlimtalk(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  applicant: ApplicantForNotification
): Promise<void> {
  const phone = applicant.phone;
  if (!phone) {
    console.warn(`[alimtalk] 입금 완료 알림톡: 수신자 전화번호 없음 (id=${applicant.id})`);
    return;
  }

  const template = await getPaymentCompleteTemplate(supabase);

  if (!template || !template.solapi_template_code) {
    return;
  }

  const variables = buildAlimtalkVariables(template.variables, {
    nickname: applicant.nickname ?? undefined,
    aid: applicant.aid ?? undefined,
    email: applicant.email ?? undefined,
    phone,
    blog_url: applicant.blog_url ?? undefined,
    class_type: applicant.class_type ?? undefined,
    writing_goal: applicant.writing_goal ?? undefined,
    personal_goal: applicant.personal_goal ?? undefined,
    is_overseas_resident: applicant.is_overseas_resident ?? undefined,
  });

  await sendAlimtalkMessage({
    to: phone,
    templateId: String(template.solapi_template_code),
    variables,
  });

  const maskedPhone = phone.replace(/\D/g, '').replace(/^(\d{3})\d+(\d{4})$/, '$1****$2');
  console.log(`[alimtalk] 입금 완료 발송 성공: ${maskedPhone}`);
}
