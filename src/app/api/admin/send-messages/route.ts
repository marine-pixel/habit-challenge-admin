import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { sendAlimtalkMessage, sendLmsMessage, buildAlimtalkVariables } from '@/lib/solapi';
import { sendEmail } from '@/lib/resend';
import { logMessageSend } from '@/lib/message-logs';
import { substituteEmailVariables, buildHtmlFromTemplateBody } from '@/lib/email-notifications';

// ── Types ──────────────────────────────────────────────────────────────────

interface RequestBody {
  template_id: string;
  aids: string[];
}

interface TemplateRow {
  id: string;
  name: string;
  channel: string;
  solapi_template_code: string | null;
  solapi_pf_id: string | null;
  title: string | null;
  body: string | null;
  variables: Array<{ key: string; value: string }> | null;
}

interface ApplicantRow {
  id: string;
  aid: string | null;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  blog_url: string | null;
  class_type: string | null;
  writing_goal: number | null;
  personal_goal: number | null;
  is_overseas_resident: boolean | null;
  status: string | null;
}

type SendStatus = 'success' | 'failed' | 'skipped';

// ── Helpers ────────────────────────────────────────────────────────────────

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  return createClient(url, key);
}

function buildApplicantVarsMap(a: ApplicantRow): Record<string, string> {
  return {
    nickname: a.nickname ?? '',
    aid: a.aid ?? '',
    email: a.email ?? '',
    phone: a.phone ?? '',
    blog_url: a.blog_url ?? '',
    class_type: a.class_type ?? '',
    writing_goal: String(a.writing_goal ?? ''),
    personal_goal: String(a.personal_goal ?? ''),
  };
}

// LMS body substitution: supports both template variables array and {{variable}} syntax
function applyLmsBody(
  body: string,
  templateVars: Array<{ key: string; value: string }> | null,
  applicant: ApplicantRow
): string {
  const fieldMap = buildApplicantVarsMap(applicant);
  let result = body;

  if (Array.isArray(templateVars) && templateVars.length > 0) {
    for (const { key, value } of templateVars) {
      if (!key) continue;
      const resolved = fieldMap[value] ?? (value !== '' ? value : '-');
      result = result.split(key).join(resolved);
    }
  }

  // Also apply {{variable}} substitution
  result = substituteEmailVariables(result, fieldMap);
  return result;
}

// ── Send per channel ────────────────────────────────────────────────────────

async function sendOneAlimtalk(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  template: TemplateRow,
  applicant: ApplicantRow
): Promise<SendStatus> {
  const logBase = {
    supabase,
    channel: 'alimtalk' as const,
    provider: 'solapi' as const,
    trigger_type: 'manual_send' as const,
    template_name: template.name,
    template_code: template.solapi_template_code ?? null,
    applicant_id: applicant.id,
    aid: applicant.aid ?? null,
    recipient_name: applicant.nickname ?? null,
    recipient_phone: applicant.phone ?? null,
    recipient_email: applicant.email ?? null,
    metadata: { manual_send: true } as Record<string, unknown>,
  };

  if (!applicant.phone) {
    await logMessageSend({ ...logBase, status: 'skipped', error_message: '전화번호 없음' });
    return 'skipped';
  }
  if (!template.solapi_template_code) {
    await logMessageSend({ ...logBase, status: 'failed', error_message: 'SOLAPI 템플릿 코드 없음' });
    return 'failed';
  }

  const variables = buildAlimtalkVariables(template.variables, {
    nickname: applicant.nickname ?? undefined,
    aid: applicant.aid ?? undefined,
    email: applicant.email ?? undefined,
    phone: applicant.phone ?? undefined,
    blog_url: applicant.blog_url ?? undefined,
    class_type: applicant.class_type ?? undefined,
    writing_goal: applicant.writing_goal ?? undefined,
    personal_goal: applicant.personal_goal ?? undefined,
    is_overseas_resident: applicant.is_overseas_resident ?? undefined,
  });

  try {
    await sendAlimtalkMessage({ to: applicant.phone, templateId: template.solapi_template_code, variables });
    await logMessageSend({ ...logBase, status: 'success' });
    return 'success';
  } catch (err) {
    await logMessageSend({
      ...logBase,
      status: 'failed',
      error_message: err instanceof Error ? err.message : String(err),
    });
    return 'failed';
  }
}

async function sendOneLms(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  template: TemplateRow,
  applicant: ApplicantRow
): Promise<SendStatus> {
  const logBase = {
    supabase,
    channel: 'lms' as const,
    provider: 'solapi' as const,
    trigger_type: 'manual_send' as const,
    template_name: template.name,
    template_code: template.solapi_template_code ?? null,
    applicant_id: applicant.id,
    aid: applicant.aid ?? null,
    recipient_name: applicant.nickname ?? null,
    recipient_phone: applicant.phone ?? null,
    recipient_email: applicant.email ?? null,
    metadata: { manual_send: true } as Record<string, unknown>,
  };

  if (!applicant.phone) {
    await logMessageSend({ ...logBase, status: 'skipped', error_message: '전화번호 없음' });
    return 'skipped';
  }
  if (!template.body?.trim()) {
    await logMessageSend({ ...logBase, status: 'failed', error_message: 'LMS 본문 없음' });
    return 'failed';
  }

  const bodyText = applyLmsBody(template.body, template.variables, applicant);
  const subject = template.title ? applyLmsBody(template.title, template.variables, applicant) : '';

  try {
    await sendLmsMessage({ to: applicant.phone, subject, text: bodyText });
    await logMessageSend({ ...logBase, status: 'success' });
    return 'success';
  } catch (err) {
    await logMessageSend({
      ...logBase,
      status: 'failed',
      error_message: err instanceof Error ? err.message : String(err),
    });
    return 'failed';
  }
}

async function sendOneEmail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  template: TemplateRow,
  applicant: ApplicantRow
): Promise<SendStatus> {
  const logBase = {
    supabase,
    channel: 'email' as const,
    provider: 'gmail_smtp' as const,
    trigger_type: 'manual_send' as const,
    template_name: template.name,
    template_code: template.solapi_template_code ?? null,
    applicant_id: applicant.id,
    aid: applicant.aid ?? null,
    recipient_name: applicant.nickname ?? null,
    recipient_phone: applicant.phone ?? null,
    recipient_email: applicant.email ?? null,
    metadata: { manual_send: true } as Record<string, unknown>,
  };

  if (!applicant.email) {
    await logMessageSend({ ...logBase, status: 'skipped', error_message: '이메일 없음' });
    return 'skipped';
  }
  if (!template.body?.trim()) {
    await logMessageSend({ ...logBase, status: 'failed', error_message: '이메일 본문 없음' });
    return 'failed';
  }

  const vars = buildApplicantVarsMap(applicant);
  const bodyText = substituteEmailVariables(template.body, vars);
  const subject = template.title
    ? substituteEmailVariables(template.title, vars)
    : '[세시간전] 습관챌린지 안내';
  const html = buildHtmlFromTemplateBody(bodyText);

  const result = await sendEmail({ to: applicant.email, subject, html, text: bodyText });

  if (result.success) {
    await logMessageSend({ ...logBase, status: 'success' });
    return 'success';
  } else {
    await logMessageSend({ ...logBase, status: 'failed', error_message: result.error ?? null });
    return 'failed';
  }
}

// ── Route Handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as RequestBody;
    const { template_id, aids } = body;

    if (!template_id) {
      return Response.json({ error: 'template_id는 필수입니다.' }, { status: 400 });
    }
    if (!Array.isArray(aids) || aids.length === 0) {
      return Response.json({ error: 'aids 배열이 필요합니다.' }, { status: 400 });
    }

    const validAids = aids.filter(aid => typeof aid === 'string' && aid.trim());
    if (validAids.length === 0) {
      return Response.json({ error: '유효한 AID가 없습니다.' }, { status: 400 });
    }

    const supabase = adminClient();

    // Fetch template
    const { data: templateData, error: templateError } = await supabase
      .from('message_templates')
      .select('id, name, channel, solapi_template_code, solapi_pf_id, title, body, variables')
      .eq('id', template_id)
      .eq('is_active', true)
      .single();

    if (templateError || !templateData) {
      return Response.json({ error: '활성 템플릿을 찾을 수 없습니다.' }, { status: 404 });
    }
    const template = templateData as TemplateRow;

    // Fetch applicants by AID
    const { data: rawApplicants, error: appError } = await supabase
      .from('applicants')
      .select('id, aid, nickname, email, phone, blog_url, class_type, writing_goal, personal_goal, is_overseas_resident, status')
      .in('aid', validAids);

    if (appError) {
      return Response.json({ error: '신청자 조회 실패: ' + appError.message }, { status: 500 });
    }

    const applicants = (rawApplicants ?? []) as ApplicantRow[];
    const applicantMap = new Map<string, ApplicantRow>();
    for (const a of applicants) {
      if (a.aid) applicantMap.set(a.aid, a);
    }

    // Send to each recipient
    const sendResults = await Promise.allSettled(
      validAids.map(async (aid): Promise<SendStatus> => {
        const applicant = applicantMap.get(aid);
        if (!applicant) {
          await logMessageSend({
            supabase,
            channel: template.channel as 'alimtalk' | 'lms' | 'email',
            provider: template.channel === 'email' ? 'gmail_smtp' : 'solapi',
            trigger_type: 'manual_send',
            template_name: template.name,
            status: 'skipped',
            aid,
            error_message: 'AID에 해당하는 신청자 없음',
            metadata: { manual_send: true },
          });
          return 'skipped';
        }

        switch (template.channel) {
          case 'alimtalk':
            return sendOneAlimtalk(supabase, template, applicant);
          case 'lms':
            return sendOneLms(supabase, template, applicant);
          case 'email':
            return sendOneEmail(supabase, template, applicant);
          default:
            await logMessageSend({
              supabase,
              channel: 'alimtalk',
              provider: 'solapi',
              trigger_type: 'manual_send',
              template_name: template.name,
              status: 'failed',
              applicant_id: applicant.id,
              aid: applicant.aid ?? null,
              error_message: `지원하지 않는 채널: ${template.channel}`,
              metadata: { manual_send: true },
            });
            return 'failed';
        }
      })
    );

    let success = 0;
    let failed = 0;
    let skipped = 0;

    for (const result of sendResults) {
      if (result.status === 'fulfilled') {
        if (result.value === 'success') success++;
        else if (result.value === 'failed') failed++;
        else if (result.value === 'skipped') skipped++;
      } else {
        failed++;
      }
    }

    return Response.json({ success, failed, skipped, total: validAids.length });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : '서버 오류' }, { status: 500 });
  }
}
