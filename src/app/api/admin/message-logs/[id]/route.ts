import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  return createClient(url, key);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = adminClient();

    // 삭제 전 테스트 발송 여부 확인 (서버에서 한 번 더 검증)
    const { data: log, error: fetchError } = await supabase
      .from('message_logs')
      .select('id, trigger_type, metadata')
      .eq('id', id)
      .single();

    if (fetchError || !log) {
      return Response.json({ error: '로그를 찾을 수 없습니다.' }, { status: 404 });
    }

    const isTest = log.trigger_type === 'test_send' ||
      (log.metadata as Record<string, unknown> | null)?.is_test === true;

    if (!isTest) {
      return Response.json({ error: '실제 발송 로그는 삭제할 수 없습니다.' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('message_logs')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return Response.json({ error: deleteError.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : '서버 오류' }, { status: 500 });
  }
}
