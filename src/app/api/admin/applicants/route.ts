import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  return createClient(url, key);
}

export async function GET() {
  try {
    const supabase = adminClient();
    const { data, error } = await supabase
      .from('applicants')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ data });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : '서버 오류' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const { aid, nickname, email, phone, blog_url, class_type, status, memo, is_overseas_resident } = body as {
      aid?: string;
      nickname?: string;
      email?: string;
      phone?: string;
      blog_url?: string;
      class_type?: string;
      status?: string;
      memo?: string;
      is_overseas_resident?: boolean;
    };

    if (!email) {
      return Response.json({ error: '이메일은 필수입니다.' }, { status: 400 });
    }

    const writing_goal = class_type === '부스터반' ? 5 : class_type === '베이직반' ? 3 : null;
    const personal_goal = class_type ? 1 : null;

    const supabase = adminClient();
    const { data, error } = await supabase
      .from('applicants')
      .insert({
        aid: aid || null,
        nickname: nickname || null,
        email,
        phone: phone || null,
        blog_url: blog_url || null,
        class_type: class_type || null,
        writing_goal,
        personal_goal,
        is_overseas_resident: is_overseas_resident ?? false,
        status: status || 'applied',
        memo: memo || null,
      })
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ data }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : '서버 오류' }, { status: 500 });
  }
}
