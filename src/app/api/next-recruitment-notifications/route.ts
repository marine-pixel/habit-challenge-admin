import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('서버 환경변수가 설정되지 않았습니다.');
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  let body: { phone?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const phone = (body.phone ?? '').replace(/\D/g, '');

  if (!phone) {
    return Response.json({ error: '휴대폰 번호를 입력해주세요.' }, { status: 400 });
  }

  let supabase: ReturnType<typeof adminClient>;
  try {
    supabase = adminClient();
  } catch {
    return Response.json({ error: '서버 환경변수가 설정되지 않았습니다.' }, { status: 500 });
  }

  const { data: existing } = await supabase
    .from('next_recruitment_notifications')
    .select('id')
    .eq('phone', phone)
    .maybeSingle();

  if (existing) {
    return Response.json({ error: '이미 알림 신청된 번호입니다.' }, { status: 409 });
  }

  const { error } = await supabase
    .from('next_recruitment_notifications')
    .insert({ phone });

  if (error) {
    console.error('[next-recruitment-notifications] insert error:', error);
    return Response.json({ error: '저장 중 오류가 발생했습니다.' }, { status: 500 });
  }

  return Response.json({ message: '알림 신청이 완료되었습니다.' }, { status: 201 });
}
