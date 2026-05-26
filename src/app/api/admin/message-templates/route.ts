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
      .from('message_templates')
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
    const raw = await request.json() as {
      name?: string;
      message_category?: string;
      channel?: string;
      solapi_template_code?: string | null;
      solapi_pf_id?: string | null;
      title?: string | null;
      body?: string | null;
      variables?: Array<{ key: string; value: string }> | null;
      is_active?: boolean;
      memo?: string | null;
    };

    if (!raw.name?.trim()) return Response.json({ error: '템플릿 이름은 필수입니다.' }, { status: 400 });
    if (!raw.message_category) return Response.json({ error: '메시지 카테고리는 필수입니다.' }, { status: 400 });
    if (!raw.channel) return Response.json({ error: '채널은 필수입니다.' }, { status: 400 });
    if (raw.channel === 'lms' && !raw.body?.trim()) {
      return Response.json({ error: 'LMS 채널은 본문이 필수입니다.' }, { status: 400 });
    }
    if (raw.channel === 'alimtalk' && !raw.solapi_template_code?.trim()) {
      return Response.json({ error: '알림톡 채널은 SOLAPI 템플릿 코드가 필수입니다.' }, { status: 400 });
    }

    const supabase = adminClient();
    const { data, error } = await supabase
      .from('message_templates')
      .insert({
        name: raw.name.trim(),
        message_category: raw.message_category,
        trigger_type: 'manual',
        channel: raw.channel,
        solapi_template_code: raw.solapi_template_code?.trim() || null,
        solapi_pf_id: raw.solapi_pf_id?.trim() || null,
        title: raw.title?.trim() || null,
        body: raw.body?.trim() ?? '',
        variables: raw.variables ?? null,
        is_active: raw.is_active ?? true,
        memo: raw.memo?.trim() || null,
      })
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ data }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : '서버 오류' }, { status: 500 });
  }
}
