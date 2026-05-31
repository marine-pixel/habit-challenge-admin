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

    const [settingsResult, countResult, listResult] = await Promise.all([
      supabase
        .from('recruitment_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('next_recruitment_notifications')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('next_recruitment_notifications')
        .select('id, phone, memo, created_at')
        .order('created_at', { ascending: false }),
    ]);

    return Response.json({
      settings: settingsResult.data ?? null,
      notificationCount: countResult.count ?? 0,
      notifications: listResult.data ?? [],
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : '서버 오류' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      id?: string;
      title?: string;
      is_open?: boolean;
      open_at?: string | null;
      close_at?: string | null;
    };

    const supabase = adminClient();

    if (body.id) {
      const { data, error } = await supabase
        .from('recruitment_settings')
        .update({
          title: body.title,
          is_open: body.is_open,
          open_at: body.open_at ?? null,
          close_at: body.close_at ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.id)
        .select()
        .single();

      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ data });
    }

    const { data, error } = await supabase
      .from('recruitment_settings')
      .insert({
        title: body.title ?? '습관챌린지',
        is_open: body.is_open ?? false,
        open_at: body.open_at ?? null,
        close_at: body.close_at ?? null,
      })
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ data }, { status: 201 });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : '서버 오류' },
      { status: 500 }
    );
  }
}
