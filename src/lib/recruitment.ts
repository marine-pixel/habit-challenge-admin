import { createClient } from '@supabase/supabase-js';

export type RecruitmentSettings = {
  id: string;
  title: string | null;
  is_open: boolean;
  open_at: string | null;
  close_at: string | null;
  challenge_month: string | null;
  created_at: string;
  updated_at: string;
};

function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('서버 환경변수가 설정되지 않았습니다.');
  return createClient(url, key);
}

export async function getRecruitmentSettings(): Promise<RecruitmentSettings | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const now = new Date().toISOString();

    // 활성 모집: is_open=true && 날짜 범위 내 (updated_at 최신 우선)
    const { data, error } = await supabase
      .from('recruitment_settings')
      .select('*')
      .eq('is_open', true)
      .or(`open_at.is.null,open_at.lte.${now}`)
      .or(`close_at.is.null,close_at.gt.${now}`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[recruitment] 설정 조회 오류:', error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.error('[recruitment] 설정 조회 실패:', e);
    return null;
  }
}

export function isRecruitmentOpen(settings: RecruitmentSettings | null): boolean {
  if (!settings || !settings.is_open) return false;

  const now = new Date();

  if (settings.open_at && now < new Date(settings.open_at)) return false;
  if (settings.close_at && now >= new Date(settings.close_at)) return false;

  return true;
}
