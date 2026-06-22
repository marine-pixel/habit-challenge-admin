import nodemailer from 'nodemailer';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SendEmailResult {
  success: boolean;
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const secure = process.env.SMTP_SECURE;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;

  if (!host || !port || !user || !pass || !from) {
    const missing = [
      !host && 'SMTP_HOST',
      !port && 'SMTP_PORT',
      !user && 'SMTP_USER',
      !pass && 'SMTP_PASS',
      !from && 'EMAIL_FROM',
    ].filter(Boolean).join(', ');
    const msg = `필수 SMTP 환경변수가 설정되지 않았습니다: ${missing}`;
    console.error('[smtp-email]', msg);
    return { success: false, error: msg };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: secure === 'true',
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '이메일 발송 중 알 수 없는 오류가 발생했습니다.',
    };
  }
}
