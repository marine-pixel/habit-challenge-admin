import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  return createClient(url, key);
}

const VALID_STATUSES = ['applied', 'paid', 'cancelled'] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

export async function PATCH(request: NextRequest) {
  try {
    const { ids, status } = await request.json() as { ids: unknown; status: unknown };

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: 'ids 배열이 필요합니다.' }, { status: 400 });
    }
    if (!VALID_STATUSES.includes(status as ValidStatus)) {
      return Response.json({ error: '유효하지 않은 상태값입니다.' }, { status: 400 });
    }

    const supabase = adminClient();
    const { error } = await supabase
      .from('applicants')
      .update({ status })
      .in('id', ids as string[]);

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : '서버 오류' }, { status: 500 });
  }
}
