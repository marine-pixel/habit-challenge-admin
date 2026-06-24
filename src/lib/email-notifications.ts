import { sendEmail } from './resend';
import { logMessageSend } from './message-logs';
import type { ApplicantForNotification } from './alimtalk-notifications';

interface EmailTemplateRow {
  id: string;
  title: string | null;
  body: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getEmailTemplate(supabase: any, templateName: string): Promise<EmailTemplateRow | null> {
  try {
    const { data, error } = await supabase
      .from('message_templates')
      .select('id, title, body')
      .eq('channel', 'email')
      .eq('is_active', true)
      .eq('name', templateName)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error || !data?.length) return null;
    return (data as EmailTemplateRow[])[0];
  } catch {
    return null;
  }
}

export function substituteEmailVariables(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// URL 패턴 (g 플래그 없이 정의 — processLine 내부에서 매번 새 RegExp 생성)
const URL_REGEX = /https?:\/\/[^\s　 <>"]+/;

function processLine(line: string): string {
  const parts: string[] = [];
  let lastIndex = 0;
  const regex = new RegExp(URL_REGEX.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(escapeHtml(line.slice(lastIndex, match.index)));
    }
    const url = match[0];
    const safeUrl = escapeHtml(url);
    parts.push(
      `<a href="${safeUrl}" style="color:#28B8D1;word-break:break-all;" target="_blank" rel="noopener noreferrer">${safeUrl}</a>`
    );
    lastIndex = match.index + url.length;
  }

  if (lastIndex < line.length) {
    parts.push(escapeHtml(line.slice(lastIndex)));
  }

  return parts.join('');
}

/**
 * 어드민 body 텍스트를 이메일 HTML로 변환합니다.
 * - 줄바꿈 → <p> 태그
 * - 빈 줄 → 문단 여백
 * - URL → 클릭 가능한 <a> 링크
 * - 이모지/특수기호 그대로 유지 (escapeHtml은 < > & "만 처리)
 * - subject 전달 시 헤더 영역에 제목으로 표시
 */
export function buildHtmlFromTemplateBody(bodyText: string, subject?: string): string {
  const htmlLines = bodyText.split('\n').map(line => {
    if (line.trim() === '') {
      return '<p style="margin:0 0 8px 0;">&nbsp;</p>';
    }
    return `<p style="margin:0 0 10px 0;">${processLine(line)}</p>`;
  });

  const htmlContent = htmlLines.join('');

  const subjectHtml = subject
    ? `<h1 style="margin:8px 0 0 0;font-size:22px;font-weight:bold;color:#1a1a2e;">${escapeHtml(subject)}</h1>`
    : '';

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a2e;line-height:1.8;max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff;">
  <div style="border-bottom:3px solid #28B8D1;padding-bottom:16px;margin-bottom:28px;">
    <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">세시간전 습관챌린지</p>${subjectHtml}
  </div>
  <div style="font-size:15px;">${htmlContent}</div>
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

// ── 자동 발송: 신청 완료 (해외 거주자) ───────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendPaymentRequestEmailIfOverseas(supabase: any, applicant: ApplicantForNotification): Promise<void> {
  if (!applicant.is_overseas_resident) return;

  const TEMPLATE_NAME = '입금 요청 이메일';

  const logBase = {
    supabase,
    channel: 'email' as const,
    provider: 'gmail_smtp' as const,
    trigger_type: 'application_created' as const,
    template_name: TEMPLATE_NAME,
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

  const template = await getEmailTemplate(supabase, TEMPLATE_NAME);

  if (!template?.body) {
    await logMessageSend({
      ...logBase,
      status: 'failed',
      error_message: '입금 요청 이메일 템플릿을 찾을 수 없습니다',
      metadata: { searched_name: TEMPLATE_NAME, searched_channel: 'email', searched_is_active: true, error_type: 'template_not_found' },
    });
    console.error(`[email] 입금 요청 이메일 템플릿 없음 — 발송 중단 (name="${TEMPLATE_NAME}")`);
    return;
  }

  if (!template.title?.trim()) {
    await logMessageSend({
      ...logBase,
      status: 'failed',
      error_message: '입금 요청 이메일 제목(title)이 없습니다',
      metadata: { searched_name: TEMPLATE_NAME, searched_channel: 'email', searched_is_active: true, error_type: 'missing_title' },
    });
    console.error(`[email] 입금 요청 이메일 title 없음 — 발송 중단`);
    return;
  }

  const vars = buildApplicantVars(applicant);
  const bodyText = substituteEmailVariables(template.body, vars);
  const subject = substituteEmailVariables(template.title, vars);
  const html = buildHtmlFromTemplateBody(bodyText, subject);

  const result = await sendEmail({ to: applicant.email, subject, html, text: bodyText });

  if (result.success) {
    await logMessageSend({
      ...logBase,
      status: 'success',
      metadata: { template_id: template.id, template_source: 'db_template' },
    });
    console.log(`[email] 입금 요청 이메일 발송 성공: ${applicant.email}`);
  } else {
    await logMessageSend({
      ...logBase,
      status: 'failed',
      error_message: result.error ?? null,
      metadata: { template_id: template.id, template_source: 'db_template' },
    });
    console.error(`[email] 입금 요청 이메일 발송 실패:`, result.error);
  }
}

// ── 자동 발송: 입금완료 상태 변경 (해외 거주자) ──────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendStartGuideEmailIfOverseas(supabase: any, applicant: ApplicantForNotification): Promise<void> {
  if (!applicant.is_overseas_resident) return;

  const TEMPLATE_NAME = '신청 완료 이메일';

  const logBase = {
    supabase,
    channel: 'email' as const,
    provider: 'gmail_smtp' as const,
    trigger_type: 'payment_marked_paid' as const,
    template_name: TEMPLATE_NAME,
    applicant_id: applicant.id,
    aid: applicant.aid ?? null,
    recipient_name: applicant.nickname ?? null,
    recipient_phone: applicant.phone ?? null,
    recipient_email: applicant.email ?? null,
  };

  if (!applicant.email) {
    await logMessageSend({ ...logBase, status: 'skipped', error_message: '이메일 주소 없음' });
    console.warn(`[email] 신청 완료 이메일: 수신자 이메일 없음 (id=${applicant.id})`);
    return;
  }

  const template = await getEmailTemplate(supabase, TEMPLATE_NAME);

  if (!template?.body) {
    await logMessageSend({
      ...logBase,
      status: 'failed',
      error_message: '신청 완료 이메일 템플릿을 찾을 수 없습니다',
      metadata: { searched_name: TEMPLATE_NAME, searched_channel: 'email', searched_is_active: true, error_type: 'template_not_found' },
    });
    console.error(`[email] 신청 완료 이메일 템플릿 없음 — 발송 중단 (name="${TEMPLATE_NAME}")`);
    return;
  }

  if (!template.title?.trim()) {
    await logMessageSend({
      ...logBase,
      status: 'failed',
      error_message: '신청 완료 이메일 제목(title)이 없습니다',
      metadata: { searched_name: TEMPLATE_NAME, searched_channel: 'email', searched_is_active: true, error_type: 'missing_title' },
    });
    console.error(`[email] 신청 완료 이메일 title 없음 — 발송 중단`);
    return;
  }

  const vars = buildApplicantVars(applicant);
  const bodyText = substituteEmailVariables(template.body, vars);
  const subject = substituteEmailVariables(template.title, vars);
  const html = buildHtmlFromTemplateBody(bodyText, subject);

  const result = await sendEmail({ to: applicant.email, subject, html, text: bodyText });

  if (result.success) {
    await logMessageSend({
      ...logBase,
      status: 'success',
      metadata: { template_id: template.id, template_source: 'db_template' },
    });
    console.log(`[email] 신청 완료 이메일 발송 성공: ${applicant.email}`);
  } else {
    await logMessageSend({
      ...logBase,
      status: 'failed',
      error_message: result.error ?? null,
      metadata: { template_id: template.id, template_source: 'db_template' },
    });
    console.error(`[email] 신청 완료 이메일 발송 실패:`, result.error);
  }
}
