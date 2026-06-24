import { sendAlimtalkMessage, buildAlimtalkVariables } from './solapi';
import { logMessageSend } from './message-logs';

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
  id: string;
  solapi_template_code: string | null;
  variables: unknown;
  name: string | null;
  title: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAlimtalkTemplateByName(supabase: any, name: string): Promise<MessageTemplate | null> {
  const { data, error } = await supabase
    .from('message_templates')
    .select('id, solapi_template_code, variables, name, title')
    .eq('channel', 'alimtalk')
    .eq('is_active', true)
    .eq('name', name)
    .not('solapi_template_code', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error(`[alimtalk] 템플릿 조회 오류 (name="${name}"):`, error.message);
    return null;
  }

  return (data as MessageTemplate[])?.[0] ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPaymentRequestTemplate(supabase: any): Promise<MessageTemplate | null> {
  const template = await fetchAlimtalkTemplateByName(supabase, '입금 요청 메시지');
  if (!template) {
    console.warn('[alimtalk] 입금 요청 메시지 템플릿을 찾을 수 없습니다');
  }
  return template;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getChallengeCompleteTemplate(supabase: any): Promise<MessageTemplate | null> {
  const template = await fetchAlimtalkTemplateByName(supabase, '신청 완료 메시지');
  if (!template) {
    console.warn('[alimtalk] 신청 완료 메시지 템플릿을 찾을 수 없습니다');
  }
  return template;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getChallengeStartTemplate(supabase: any): Promise<MessageTemplate | null> {
  const template = await fetchAlimtalkTemplateByName(supabase, '시작 메시지');
  if (!template) {
    console.warn('[alimtalk] 시작 메시지 템플릿을 찾을 수 없습니다');
  }
  return template;
}

export async function sendPaymentRequestAlimtalk(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  applicant: ApplicantForNotification
): Promise<void> {
  const phone = applicant.phone;
  const logBase = {
    supabase,
    channel: 'alimtalk' as const,
    provider: 'solapi' as const,
    trigger_type: 'application_created' as const,
    template_name: '입금 요청 메시지',
    applicant_id: applicant.id,
    aid: applicant.aid ?? null,
    recipient_name: applicant.nickname ?? null,
    recipient_phone: phone ?? null,
    recipient_email: applicant.email ?? null,
  };

  if (!phone) {
    console.warn(`[alimtalk] 입금 요청 알림톡: 수신자 전화번호 없음 (id=${applicant.id})`);
    await logMessageSend({ ...logBase, status: 'skipped', error_message: '전화번호 없음' });
    return;
  }

  const template = await getPaymentRequestTemplate(supabase);

  if (!template || !template.solapi_template_code) {
    await logMessageSend({
      ...logBase,
      status: 'failed',
      error_message: '입금 요청 메시지 템플릿을 찾을 수 없습니다',
      metadata: { searched_name: '입금 요청 메시지', searched_channel: 'alimtalk', searched_is_active: true, error_type: 'template_not_found' },
    });
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

  try {
    await sendAlimtalkMessage({
      to: phone,
      templateId: String(template.solapi_template_code),
      variables,
    });

    const maskedPhone = phone.replace(/\D/g, '').replace(/^(\d{3})\d+(\d{4})$/, '$1****$2');
    console.log(`[alimtalk] 입금 요청 발송 성공: ${maskedPhone}`);
    await logMessageSend({
      ...logBase,
      template_code: template.solapi_template_code,
      status: 'success',
      metadata: { template_id: template.id, template_source: 'db_template' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[alimtalk] 입금 요청 발송 실패:', message);
    await logMessageSend({
      ...logBase,
      template_code: template.solapi_template_code,
      status: 'failed',
      error_message: message,
      metadata: { template_id: template.id, template_source: 'db_template' },
    });
    throw err;
  }
}

// 입금완료 시 신청 완료 메시지 발송
export async function sendPaymentCompleteAlimtalk(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  applicant: ApplicantForNotification
): Promise<void> {
  const phone = applicant.phone;
  const logBase = {
    supabase,
    channel: 'alimtalk' as const,
    provider: 'solapi' as const,
    trigger_type: 'payment_marked_paid' as const,
    template_name: '신청 완료 메시지',
    applicant_id: applicant.id,
    aid: applicant.aid ?? null,
    recipient_name: applicant.nickname ?? null,
    recipient_phone: phone ?? null,
    recipient_email: applicant.email ?? null,
  };

  if (!phone) {
    console.warn(`[alimtalk] 신청 완료 메시지 알림톡: 수신자 전화번호 없음 (id=${applicant.id})`);
    await logMessageSend({ ...logBase, status: 'skipped', error_message: '전화번호 없음' });
    return;
  }

  const template = await getChallengeCompleteTemplate(supabase);

  if (!template || !template.solapi_template_code) {
    await logMessageSend({
      ...logBase,
      status: 'failed',
      error_message: '신청 완료 메시지 템플릿을 찾을 수 없습니다',
      metadata: { searched_name: '신청 완료 메시지', searched_channel: 'alimtalk', searched_is_active: true, error_type: 'template_not_found' },
    });
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

  try {
    await sendAlimtalkMessage({
      to: phone,
      templateId: String(template.solapi_template_code),
      variables,
    });

    const maskedPhone = phone.replace(/\D/g, '').replace(/^(\d{3})\d+(\d{4})$/, '$1****$2');
    console.log(`[alimtalk] 신청 완료 메시지 발송 성공: ${maskedPhone}`);
    await logMessageSend({
      ...logBase,
      template_code: template.solapi_template_code,
      status: 'success',
      metadata: { template_id: template.id, template_source: 'db_template' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[alimtalk] 신청 완료 메시지 발송 실패:', message);
    await logMessageSend({
      ...logBase,
      template_code: template.solapi_template_code,
      status: 'failed',
      error_message: message,
      metadata: { template_id: template.id, template_source: 'db_template' },
    });
    throw err;
  }
}
