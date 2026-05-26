import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  return createClient(url, key);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as {
      aid?: string;
      nickname?: string;
      email?: string;
      phone?: string;
      blog_url?: string;
      class_type?: string;
      status?: string;
      memo?: string;
    };

    if ('email' in body && !body.email) {
      return Response.json({ error: '이메일은 필수입니다.' }, { status: 400 });
    }

    // Partial update — only include fields explicitly present in the body
    const updateData: Record<string, unknown> = {};
    if ('aid' in body) updateData.aid = body.aid || null;
    if ('nickname' in body) updateData.nickname = body.nickname || null;
    if ('email' in body) updateData.email = body.email;
    if ('phone' in body) updateData.phone = body.phone || null;
    if ('blog_url' in body) updateData.blog_url = body.blog_url || null;
    if ('status' in body) updateData.status = body.status;
    if ('memo' in body) updateData.memo = body.memo || null;
    if ('class_type' in body) {
      updateData.class_type = body.class_type || null;
      if (body.class_type === '베이직반') {
        updateData.writing_goal = 3;
        updateData.personal_goal = 1;
      } else if (body.class_type === '부스터반') {
        updateData.writing_goal = 5;
        updateData.personal_goal = 1;
      } else {
        updateData.writing_goal = null;
        updateData.personal_goal = null;
      }
    }

    const supabase = adminClient();
    const { data, error } = await supabase
      .from('applicants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ data });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : '서버 오류' }, { status: 500 });
  }
}
