import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      challenge_month?: string;
      label?: string;
      source?: string;
      medium?: string;
      campaign?: string;
      content?: string;
      url?: string;
      memo?: string;
    };

    if (!body.source || !body.url) {
      return Response.json({ error: '채널(source)과 URL은 필수입니다.' }, { status: 400 });
    }

    const supabase = adminClient();
    const { data, error } = await supabase
      .from('utm_links')
      .insert({
        challenge_month: body.challenge_month || null,
        label: body.label || null,
        source: body.source,
        medium: body.medium || null,
        campaign: body.campaign || null,
        content: body.content || null,
        url: body.url,
        memo: body.memo || null,
      })
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ data }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : '서버 오류' }, { status: 500 });
  }
}
