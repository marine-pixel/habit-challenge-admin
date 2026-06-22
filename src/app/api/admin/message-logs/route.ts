import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const channel = searchParams.get('channel');
    const status = searchParams.get('status');
    const triggerType = searchParams.get('trigger_type');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500);

    const supabase = adminClient();
    let query = supabase
      .from('message_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (channel) query = query.eq('channel', channel);
    if (status) query = query.eq('status', status);
    if (triggerType) query = query.eq('trigger_type', triggerType);

    const { data, error } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ data });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : '서버 오류' }, { status: 500 });
  }
}
