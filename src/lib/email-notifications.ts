import { sendEmail } from './resend';
import { logMessageSend } from './message-logs';
import type { ApplicantForNotification } from './alimtalk-notifications';

interface EmailTemplateRow {
  title: string | null;
  body: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getEmailTemplate(supabase: any, templateName: string): Promise<EmailTemplateRow | null> {
  try {
    const { data, error } = await supabase
      .from('message_templates')
      .select('title, body')
      .eq('channel', 'email')
      .eq('is_active', true)
      .eq('name', templateName)
      .maybeSingle();
    if (error || !data) return null;
    return data as EmailTemplateRow;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getEmailTemplateByNames(supabase: any, ...names: string[]): Promise<EmailTemplateRow | null> {
  for (const name of names) {
    const result = await getEmailTemplate(supabase, name);
    if (result) return result;
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function substituteEmailVariables(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

export function buildHtmlFromTemplateBody(bodyText: string): string {
  const escaped = bodyText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const htmlContent = escaped
    .split('\n')
    .map(line => `<p style="margin:0 0 10px 0;">${line || '&nbsp;'}</p>`)
    .join('');
  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a2e;line-height:1.7;max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff;">
  <div style="border-bottom:3px solid #28B8D1;padding-bottom:16px;margin-bottom:28px;">
    <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">세시간전 습관챌린지</p>
  </div>
  <div style="font-size:15px;">${htmlContent}</div>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
  <p style="font-size:13px;color:#9ca3af;margin:0;">세시간전 습관챌린지 운영팀 드림</p>
</body>
</html>`;
}

function buildApplicantVars(applicant: ApplicantForNotification): Record<string, string> {
  return {
    nickname: applicant.nickname ?? '',
    aid: applicant.aid ?? '',
    email: applicant.email ?? '',
    phone: applicant.phone ?? '',
    blog_url: applicant.blog_url ?? '',
    class_type: applicant.class_type ?? '',
    writing_goal: String(applicant.writing_goal ?? ''),
    personal_goal: String(applicant.personal_goal ?? ''),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendPaymentRequestEmailIfOverseas(supabase: any, applicant: ApplicantForNotification): Promise<void> {
  if (!applicant.is_overseas_resident) return;

  const logBase = {
    supabase,
    channel: 'email' as const,
    provider: 'gmail_smtp' as const,
    trigger_type: 'application_created' as const,
    template_name: '입금 요청 이메일 (해외 거주자)',
    applicant_id: applicant.id,
    aid: applicant.aid ?? null,
    recipient_name: applicant.nickname ?? null,
    recipient_phone: applicant.phone ?? null,
    recipient_email: applicant.email ?? null,
  };

  if (!applicant.email) {
    await logMessageSend({ ...logBase, status: 'skipped', error_message: '이메일 주소 없음' });
    console.warn(`[email] 입금 요청 이메일: 수신자 이메일 없음 (id=${applicant.id})`);
    return;
  }

  let subject: string;
  let html: string;
  let text: string;
  let templateSource: string;

  const template = await getEmailTemplate(supabase, '입금 요청 이메일');
  if (template?.body) {
    const vars = buildApplicantVars(applicant);
    const bodyText = substituteEmailVariables(template.body, vars);
    subject = template.title
      ? substituteEmailVariables(template.title, vars)
      : '[세시간전] 습관챌린지 참가비 입금 안내';
    html = buildHtmlFromTemplateBody(bodyText);
    text = bodyText;
    templateSource = 'db_template';
  } else {
    subject = '[세시간전] 습관챌린지 참가비 입금 안내';
    html = buildPaymentRequestHtml(applicant);
    text = buildPaymentRequestText(applicant);
    templateSource = 'fallback';
    console.log('[email] 입금 요청 이메일 템플릿 없음 — 기본 문구 사용');
  }

  const result = await sendEmail({ to: applicant.email, subject, html, text });

  if (result.success) {
    await logMessageSend({ ...logBase, status: 'success', metadata: { template_source: templateSource } });
    console.log(`[email] 입금 요청 이메일 발송 성공: ${applicant.email} (source=${templateSource})`);
  } else {
    await logMessageSend({
      ...logBase,
      status: 'failed',
      error_message: result.error ?? null,
      metadata: { template_source: templateSource },
    });
    console.error(`[email] 입금 요청 이메일 발송 실패:`, result.error);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendStartGuideEmailIfOverseas(supabase: any, applicant: ApplicantForNotification): Promise<void> {
  if (!applicant.is_overseas_resident) return;

  const logBase = {
    supabase,
    channel: 'email' as const,
    provider: 'gmail_smtp' as const,
    trigger_type: 'payment_marked_paid' as const,
    template_name: '시작 안내 이메일 (해외 거주자)',
    applicant_id: applicant.id,
    aid: applicant.aid ?? null,
    recipient_name: applicant.nickname ?? null,
    recipient_phone: applicant.phone ?? null,
    recipient_email: applicant.email ?? null,
  };

  if (!applicant.email) {
    await logMessageSend({ ...logBase, status: 'skipped', error_message: '이메일 주소 없음' });
    console.warn(`[email] 시작 안내 이메일: 수신자 이메일 없음 (id=${applicant.id})`);
    return;
  }

  let subject: string;
  let html: string;
  let text: string;
  let templateSource: string;

  // 입금완료 상태 변경 전용 — "완료 안내 이메일" 템플릿만 사용
  // "시작 안내 이메일"은 챌린지 시작일 수동 발송용이므로 여기서는 fallback으로 사용하지 않음
  const template = await getEmailTemplate(supabase, '완료 안내 이메일');
  if (template?.body) {
    const vars = buildApplicantVars(applicant);
    const bodyText = substituteEmailVariables(template.body, vars);
    subject = template.title
      ? substituteEmailVariables(template.title, vars)
      : '[세시간전] 습관챌린지 완료 안내';
    html = buildHtmlFromTemplateBody(bodyText);
    text = bodyText;
    templateSource = 'db_template';
  } else {
    subject = '[세시간전] 습관챌린지 시작 안내';
    html = buildStartGuideHtml(applicant);
    text = buildStartGuideText(applicant);
    templateSource = 'fallback';
    console.log('[email] 완료 안내 이메일 템플릿 없음 — 기본 문구 사용');
  }

  const result = await sendEmail({ to: applicant.email, subject, html, text });

  if (result.success) {
    await logMessageSend({ ...logBase, status: 'success', metadata: { template_source: templateSource } });
    console.log(`[email] 시작 안내 이메일 발송 성공: ${applicant.email} (source=${templateSource})`);
  } else {
    await logMessageSend({
      ...logBase,
      status: 'failed',
      error_message: result.error ?? null,
      metadata: { template_source: templateSource },
    });
    console.error(`[email] 시작 안내 이메일 발송 실패:`, result.error);
  }
}

function buildPaymentRequestHtml(applicant: ApplicantForNotification): string {
  const name = applicant.nickname ?? '신청자';
  const rows = [
    applicant.aid ? `<tr><td style="color:#6b7280;padding:4px 0;">AID</td><td style="padding:4px 0 4px 16px;">${applicant.aid}</td></tr>` : '',
    applicant.class_type ? `<tr><td style="color:#6b7280;padding:4px 0;">참여반</td><td style="padding:4px 0 4px 16px;">${applicant.class_type}</td></tr>` : '',
  ].filter(Boolean).join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a2e;line-height:1.7;max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff;">
  <div style="border-bottom:3px solid #28B8D1;padding-bottom:16px;margin-bottom:28px;">
    <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">세시간전 습관챌린지</p>
    <h1 style="margin:0;font-size:22px;font-weight:bold;color:#1a1a2e;">참가비 입금 안내</h1>
  </div>
  <p>안녕하세요, <strong>${name}</strong>님!</p>
  <p>세시간전 습관챌린지 신청이 완료되었습니다. 🎉</p>
  <p style="background:#f0fdfe;border-left:4px solid #28B8D1;padding:12px 16px;border-radius:4px;font-size:14px;color:#0e7490;">
    현재 해외에 체류/거주 중이신 관계로 카카오톡 알림톡 수신이 어려울 수 있어 이메일로도 안내드립니다.
  </p>
  ${rows ? `<table style="margin:24px 0;font-size:14px;">${rows}</table>` : ''}
  <div style="background:#f9fafb;border-radius:12px;padding:20px 24px;margin:24px 0;">
    <p style="margin:0 0 8px;font-weight:bold;font-size:15px;">💳 참가비 입금 안내</p>
    <p style="margin:0;font-size:14px;">참가비 <strong>1만원</strong>을 입금해 주세요.<br>입금 확인 후 참여가 최종 확정됩니다.</p>
  </div>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
  <p style="font-size:13px;color:#9ca3af;margin:0;">문의사항이 있으시면 세시간전 운영진에게 연락해 주세요.<br>세시간전 습관챌린지 운영팀 드림</p>
</body>
</html>`;
}

function buildPaymentRequestText(applicant: ApplicantForNotification): string {
  const name = applicant.nickname ?? '신청자';
  return [
    '[세시간전] 습관챌린지 참가비 입금 안내',
    '',
    `안녕하세요, ${name}님!`,
    '세시간전 습관챌린지 신청이 완료되었습니다.',
    '',
    '현재 해외에 체류/거주 중이신 관계로 카카오톡 알림톡 수신이 어려울 수 있어 이메일로도 안내드립니다.',
    '',
    applicant.aid ? `AID: ${applicant.aid}` : '',
    applicant.class_type ? `참여반: ${applicant.class_type}` : '',
    '',
    '■ 참가비 입금 안내',
    '참가비 1만원을 입금해 주세요.',
    '입금 확인 후 참여가 최종 확정됩니다.',
    '',
    '세시간전 습관챌린지 운영팀 드림',
  ].filter(line => line !== null).join('\n');
}

function buildStartGuideHtml(applicant: ApplicantForNotification): string {
  const name = applicant.nickname ?? '신청자';
  const rows = [
    applicant.aid ? `<tr><td style="color:#6b7280;padding:4px 0;">AID</td><td style="padding:4px 0 4px 16px;">${applicant.aid}</td></tr>` : '',
    applicant.class_type ? `<tr><td style="color:#6b7280;padding:4px 0;">참여반</td><td style="padding:4px 0 4px 16px;">${applicant.class_type}</td></tr>` : '',
  ].filter(Boolean).join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a2e;line-height:1.7;max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff;">
  <div style="border-bottom:3px solid #28B8D1;padding-bottom:16px;margin-bottom:28px;">
    <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">세시간전 습관챌린지</p>
    <h1 style="margin:0;font-size:22px;font-weight:bold;color:#1a1a2e;">챌린지 시작 안내</h1>
  </div>
  <p>안녕하세요, <strong>${name}</strong>님!</p>
  <p>입금이 확인되어 챌린지 참여가 <strong>최종 확정</strong>되었습니다. 🎉</p>
  <p style="background:#f0fdfe;border-left:4px solid #28B8D1;padding:12px 16px;border-radius:4px;font-size:14px;color:#0e7490;">
    현재 해외에 체류/거주 중이신 관계로 카카오톡 알림톡 수신이 어려울 수 있어 이메일로도 안내드립니다.
  </p>
  ${rows ? `<table style="margin:24px 0;font-size:14px;">${rows}</table>` : ''}
  <div style="background:#f9fafb;border-radius:12px;padding:20px 24px;margin:24px 0;">
    <p style="margin:0 0 8px;font-weight:bold;font-size:15px;">🚀 챌린지 시작 안내</p>
    <p style="margin:0;font-size:14px;">이제 챌린지가 시작됩니다! 함께 습관을 만들어 나가요.</p>
  </div>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
  <p style="font-size:13px;color:#9ca3af;margin:0;">궁금한 점은 세시간전 운영진에게 문의해 주세요.<br>세시간전 습관챌린지 운영팀 드림</p>
</body>
</html>`;
}

function buildStartGuideText(applicant: ApplicantForNotification): string {
  const name = applicant.nickname ?? '신청자';
  return [
    '[세시간전] 습관챌린지 시작 안내',
    '',
    `안녕하세요, ${name}님!`,
    '입금이 확인되어 챌린지 참여가 최종 확정되었습니다.',
    '',
    '현재 해외에 체류/거주 중이신 관계로 카카오톡 알림톡 수신이 어려울 수 있어 이메일로도 안내드립니다.',
    '',
    applicant.aid ? `AID: ${applicant.aid}` : '',
    applicant.class_type ? `참여반: ${applicant.class_type}` : '',
    '',
    '■ 챌린지 시작 안내',
    '이제 챌린지가 시작됩니다! 함께 습관을 만들어 나가요.',
    '',
    '세시간전 습관챌린지 운영팀 드림',
  ].filter(line => line !== null).join('\n');
}
