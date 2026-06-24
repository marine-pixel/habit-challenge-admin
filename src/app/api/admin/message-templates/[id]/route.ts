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

    const { error } = await supabase
      .from('message_templates')
      .delete()
      .eq('id', id);

    if (!error) {
      return Response.json({ success: true, deleted: true });
    }

    // FK 제약 오류(23503)인 경우 소프트 삭제로 대체
    if (error.code === '23503') {
      const { error: softErr } = await supabase
        .from('message_templates')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (softErr) return Response.json({ error: softErr.message }, { status: 500 });
      return Response.json({ success: true, deleted: false, message: '발송 기록이 연결되어 있어 미사용 처리되었습니다.' });
    }

    return Response.json({ error: error.message }, { status: 500 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : '서버 오류' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const raw = await request.json() as Record<string, unknown>;

    const channel = 'channel' in raw ? String(raw.channel) : undefined;
    if (channel === 'lms' && 'body' in raw && !String(raw.body ?? '').trim()) {
      return Response.json({ error: 'LMS 채널은 본문이 필수입니다.' }, { status: 400 });
    }
    if (channel === 'email' && 'body' in raw && !String(raw.body ?? '').trim()) {
      return Response.json({ error: '이메일 채널은 본문이 필수입니다.' }, { status: 400 });
    }
    if (channel === 'email' && 'title' in raw && !String(raw.title ?? '').trim()) {
      return Response.json({ error: '이메일 채널은 제목(이메일 제목)이 필수입니다.' }, { status: 400 });
    }
    if (channel === 'alimtalk' && 'solapi_template_code' in raw && !String(raw.solapi_template_code ?? '').trim()) {
      return Response.json({ error: '알림톡 채널은 SOLAPI 템플릿 코드가 필수입니다.' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if ('name' in raw) updateData.name = raw.name;
    if ('message_category' in raw) updateData.message_category = raw.message_category;
    if ('channel' in raw) updateData.channel = raw.channel;
    if ('solapi_template_code' in raw) updateData.solapi_template_code = raw.solapi_template_code || null;
    if ('solapi_pf_id' in raw) updateData.solapi_pf_id = raw.solapi_pf_id || null;
    if ('title' in raw) updateData.title = raw.title || null;
    if ('body' in raw) updateData.body = raw.body ?? '';
    if ('variables' in raw) updateData.variables = raw.variables ?? null;
    if ('is_active' in raw) updateData.is_active = raw.is_active;
    if ('memo' in raw) updateData.memo = raw.memo || null;

    const supabase = adminClient();
    const { data, error } = await supabase
      .from('message_templates')
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
