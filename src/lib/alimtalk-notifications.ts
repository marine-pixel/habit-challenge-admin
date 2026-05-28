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

  const { data: templates } = await supabase
    .from('message_templates')
    .select('solapi_template_code, variables, message_category, name, title')
    .eq('channel', 'alimtalk')
    .eq('is_active', true)
    .order('updated_at', { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const template = (templates ?? []).find((t: any) =>
    t.message_category === 'payment_complete' ||
    (typeof t.message_category === 'string' && t.message_category.includes('입금')) ||
    (typeof t.name === 'string' && t.name.includes('입금 완료')) ||
    (typeof t.title === 'string' && t.title.includes('입금 완료'))
  );

  if (!template) {
    console.warn('[alimtalk] 활성화된 입금 완료 알림톡 템플릿이 없습니다.');
    return;
  }

  if (!template.solapi_template_code) {
    console.warn('[alimtalk] 입금 완료 템플릿에 solapi_template_code가 없어 발송을 건너뜁니다.');
    return;
  }

  const applicantData = {
    nickname: applicant.nickname ?? undefined,
    aid: applicant.aid ?? undefined,
    email: applicant.email ?? undefined,
    phone,
    blog_url: applicant.blog_url ?? undefined,
    class_type: applicant.class_type ?? undefined,
    writing_goal: applicant.writing_goal ?? undefined,
    personal_goal: applicant.personal_goal ?? undefined,
    is_overseas_resident: applicant.is_overseas_resident ?? undefined,
  };

  const variables = buildAlimtalkVariables(template.variables, applicantData);

  await sendAlimtalkMessage({
    to: phone,
    templateId: String(template.solapi_template_code),
    variables,
  });

  const maskedPhone = phone.replace(/\D/g, '').replace(/^(\d{3})\d+(\d{4})$/, '$1****$2');
  console.log(`[alimtalk] 입금 완료 발송 성공: ${maskedPhone}`);
}
