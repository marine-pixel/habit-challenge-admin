import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { sendPaymentRequestAlimtalk } from '@/lib/alimtalk-notifications';
import { sendPaymentRequestEmailIfOverseas } from '@/lib/email-notifications';
import { getRecruitmentSettings, isRecruitmentOpen } from '@/lib/recruitment';

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('서버 환경변수가 설정되지 않았습니다.');
  }

  return createClient(url, serviceRoleKey);
}

export async function POST(request: NextRequest) {
  const recruitmentSettings = await getRecruitmentSettings();
  if (!isRecruitmentOpen(recruitmentSettings)) {
    return Response.json({ error: '현재 모집 기간이 아닙니다.' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const { aid, nickname, email, phone, blog_url, class_type, goal, privacy_agreed, is_overseas_resident, is_first_time, utm_source, utm_medium, utm_campaign, utm_content, referrer_url, landing_url } = body as {
    aid: string;
    nickname: string;
    email: string;
    phone: string;
    blog_url: string;
    class_type: string;
    goal: string | null;
    privacy_agreed: boolean;
    is_overseas_resident?: boolean;
    is_first_time?: boolean;
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_content?: string | null;
    referrer_url?: string | null;
    landing_url?: string | null;
  };

  if (!aid || !/^\d{6}$/.test(String(aid))) {
    return Response.json({ error: 'AID는 숫자 6자리를 입력해주세요.' }, { status: 400 });
  }

  if (!email) {
    return Response.json({ error: '이메일을 입력해주세요.' }, { status: 400 });
  }

  if (!privacy_agreed) {
    return Response.json({ error: '개인정보 수집 및 이용에 동의해주세요.' }, { status: 400 });
  }

  if (!class_type || !['베이직반', '부스터반'].includes(class_type)) {
    return Response.json({ error: '참여 반을 선택해주세요.' }, { status: 400 });
  }

  const writing_goal = class_type === '베이직반' ? 3 : 5;
  const personal_goal = 1;

  const challenge_month = (() => {
    if (recruitmentSettings?.challenge_month) return recruitmentSettings.challenge_month;
    const ref = recruitmentSettings?.open_at ? new Date(recruitmentSettings.open_at) : new Date();
    const kst = new Date(ref.getTime() + 9 * 60 * 60 * 1000);
    return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}`;
  })();

  let supabase: ReturnType<typeof createSupabaseClient>;
  try {
    supabase = createSupabaseClient();
  } catch {
    return Response.json({ error: '서버 환경변수가 설정되지 않았습니다.' }, { status: 500 });
  }

  const { data: newApplicant, error } = await supabase
    .from('applicants')
    .insert({
      aid,
      nickname,
      email,
      phone,
      blog_url,
      class_type,
      writing_goal,
      personal_goal,
      goal: goal ?? null,
      privacy_agreed,
      is_overseas_resident: is_overseas_resident ?? false,
      is_first_time: is_first_time ?? false,
      status: 'applied',
      challenge_month,
      utm_source: utm_source ?? null,
      utm_medium: utm_medium ?? null,
      utm_campaign: utm_campaign ?? null,
      utm_content: utm_content ?? null,
      referrer_url: referrer_url ?? null,
      landing_url: landing_url ?? null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    return Response.json(
      { error: '신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }

  const applicantPayload = {
    id: newApplicant.id,
    nickname,
    aid,
    email,
    phone,
    blog_url,
    class_type,
    writing_goal,
    personal_goal,
    is_overseas_resident: is_overseas_resident ?? false,
  };

  // 입금 요청 알림톡 발송 (실패해도 신청 저장 결과는 유지)
  try {
    await sendPaymentRequestAlimtalk(supabase, applicantPayload);
  } catch (err) {
    console.error('[alimtalk] 발송 실패:', err instanceof Error ? err.message : err);
  }

  // 해외 체류/거주자에게 이메일 추가 발송 (실패해도 신청 저장 결과는 유지)
  if (is_overseas_resident) {
    try {
      await sendPaymentRequestEmailIfOverseas(supabase, applicantPayload);
    } catch (err) {
      console.error('[email] 입금 요청 이메일 발송 실패:', err instanceof Error ? err.message : err);
    }
  }

  return Response.json({ success: true }, { status: 201 });
}
