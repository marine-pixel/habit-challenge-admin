import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('서버 환경변수가 설정되지 않았습니다.');
  }

  return createClient(url, serviceRoleKey);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const { aid, nickname, email, phone, blog_url, class_type, goal, privacy_agreed } = body as {
    aid: string;
    nickname: string;
    email: string;
    phone: string;
    blog_url: string;
    class_type: string;
    goal: string | null;
    privacy_agreed: boolean;
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

  let supabase: ReturnType<typeof createSupabaseClient>;
  try {
    supabase = createSupabaseClient();
  } catch {
    return Response.json({ error: '서버 환경변수가 설정되지 않았습니다.' }, { status: 500 });
  }

  const { data: existing } = await supabase
    .from('applicants')
    .select('aid')
    .eq('aid', aid)
    .maybeSingle();

  if (existing) {
    return Response.json({ error: '이미 신청된 AID입니다.' }, { status: 409 });
  }

  const { error } = await supabase.from('applicants').insert({
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
  });

  if (error) {
    console.error('Supabase insert error:', error);
    return Response.json(
      { error: '신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }

  return Response.json({ success: true }, { status: 201 });
}
