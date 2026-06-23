import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  return createClient(url, key);
}

type RecruitmentSettings = {
  id: string;
  title: string | null;
  is_open: boolean;
  open_at: string | null;
  close_at: string | null;
  challenge_month: string | null;
  created_at: string;
  updated_at: string;
};

export async function GET() {
  try {
    const supabase = adminClient();
    const now = new Date().toISOString();

    const [allSettingsResult, countResult, listResult] = await Promise.all([
      supabase
        .from('recruitment_settings')
        .select('*')
        .order('challenge_month', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('next_recruitment_notifications')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('next_recruitment_notifications')
        .select('id, phone, memo, created_at')
        .order('created_at', { ascending: false }),
    ]);

    const allSettings: RecruitmentSettings[] = allSettingsResult.data ?? [];

    // 활성 모집 판단: is_open=true && challenge_month 설정됨 && 날짜 범위 내
    const activeSettings =
      allSettings.find((s) => {
        if (!s.is_open) return false;
        if (!s.challenge_month) return false;
        if (s.open_at && now < s.open_at) return false;
        if (s.close_at && now >= s.close_at) return false;
        return true;
      }) ?? null;

    return Response.json({
      settings: allSettings,
      activeSettings,
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
      challenge_month?: string | null;
      close_others?: boolean;
    };

    const supabase = adminClient();
    const now = new Date().toISOString();

    if (body.id) {
      // 기존 레코드 수정
      const { data, error } = await supabase
        .from('recruitment_settings')
        .update({
          title: body.title,
          is_open: body.is_open,
          open_at: body.open_at ?? null,
          close_at: body.close_at ?? null,
          challenge_month: body.challenge_month ?? null,
          updated_at: now,
        })
        .eq('id', body.id)
        .select()
        .single();

      if (error) return Response.json({ error: error.message }, { status: 500 });

      // is_open=true로 열 때 close_others가 true이면 나머지 모두 닫기
      if (body.is_open && body.close_others) {
        await supabase
          .from('recruitment_settings')
          .update({ is_open: false, updated_at: now })
          .neq('id', body.id);
      }

      return Response.json({ data });
    }

    // 새 레코드 생성
    const { data, error } = await supabase
      .from('recruitment_settings')
      .insert({
        title: body.title ?? '습관챌린지',
        is_open: body.is_open ?? false,
        open_at: body.open_at ?? null,
        close_at: body.close_at ?? null,
        challenge_month: body.challenge_month ?? null,
      })
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    // 새 레코드를 열 때 close_others가 true이면 나머지 모두 닫기
    if (body.is_open && body.close_others && data.id) {
      await supabase
        .from('recruitment_settings')
        .update({ is_open: false, updated_at: now })
        .neq('id', data.id);
    }

    return Response.json({ data }, { status: 201 });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : '서버 오류' },
      { status: 500 }
    );
  }
}
