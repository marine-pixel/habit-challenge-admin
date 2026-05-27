import { createHmac, randomBytes } from 'crypto';

const KNOWN_APPLICANT_FIELDS = new Set([
  'name',
  'nickname',
  'aid',
  'email',
  'phone',
  'blog_url',
  'class_type',
  'writing_goal',
  'personal_goal',
  'is_overseas_resident',
]);

type ApplicantData = Partial<Record<string, string | number | boolean>>;

function getEnvOrThrow(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`${name} 환경변수가 설정되지 않았습니다.`);
  return val;
}

function buildAuthHeader(): string {
  const apiKey = getEnvOrThrow('SOLAPI_API_KEY');
  const apiSecret = getEnvOrThrow('SOLAPI_API_SECRET');
  const date = new Date().toISOString();
  const salt = randomBytes(16).toString('hex');
  const signature = createHmac('sha256', apiSecret)
    .update(date + salt)
    .digest('hex');
  return `HMAC-SHA256 ApiKey=${apiKey}, Date=${date}, salt=${salt}, Signature=${signature}`;
}

function resolveVariable(value: string, applicant: ApplicantData): string {
  if (!KNOWN_APPLICANT_FIELDS.has(value)) return value || '-';
  const raw = applicant[value];
  if (raw === undefined || raw === null || raw === '') return '-';
  if (value === 'is_overseas_resident') return raw ? '해외' : '국내';
  return String(raw);
}

export function buildAlimtalkVariables(
  templateVariables: unknown,
  applicant: ApplicantData
): Record<string, string> {
  if (!Array.isArray(templateVariables)) return {};
  const result: Record<string, string> = {};
  for (const item of templateVariables) {
    if (typeof item !== 'object' || item === null) continue;
    const entry = item as Record<string, unknown>;
    const key = entry.key;
    const value = entry.value;
    if (typeof key !== 'string' || !key) continue;
    result[key] = resolveVariable(typeof value === 'string' ? value : '', applicant);
  }
  return result;
}

export async function sendAlimtalkMessage({
  to,
  templateId,
  variables,
}: {
  to: string;
  templateId: string;
  variables: Record<string, string>;
}): Promise<void> {
  const senderNumber = getEnvOrThrow('SOLAPI_SENDER_NUMBER');
  const pfId = getEnvOrThrow('SOLAPI_PF_ID');

  const normalizedTo = to.replace(/\D/g, '');
  if (!normalizedTo) throw new Error('수신자 휴대폰 번호가 유효하지 않습니다.');

  const payload = {
    message: {
      to: normalizedTo,
      from: senderNumber.replace(/\D/g, ''),
      kakaoOptions: {
        pfId,
        templateId,
        variables,
      },
    },
  };

  const res = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: buildAuthHeader(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SOLAPI 응답 오류 (${res.status}): ${text}`);
  }
}
