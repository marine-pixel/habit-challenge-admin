import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  return createClient(url, key);
}

type ApplicantUtm = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  challenge_month: string | null;
};

type UtmLink = {
  id: string;
  challenge_month: string | null;
  label: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  url: string;
  memo: string | null;
  created_at: string;
};

type RecruitmentSetting = {
  challenge_month: string | null;
  is_open: boolean;
  open_at: string | null;
  close_at: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const challengeMonth = searchParams.get('challenge_month');
    const utmSource = searchParams.get('utm_source');

    const supabase = adminClient();

    // Filtered applicants for stats (challenge_month + utm_source filters apply)
    let statsQuery = supabase
      .from('applicants')
      .select('utm_source, utm_medium, utm_campaign, utm_content, challenge_month');

    if (challengeMonth && challengeMonth !== 'all') {
      statsQuery = statsQuery.eq('challenge_month', challengeMonth);
    }
    if (utmSource && utmSource !== 'all') {
      if (utmSource === 'none') {
        statsQuery = statsQuery.is('utm_source', null);
      } else {
        statsQuery = statsQuery.eq('utm_source', utmSource);
      }
    }

    const [
      grandTotalResult,
      applicantsResult,
      utmLinksResult,
      recruitmentResult,
      applicantMonthsResult,
    ] = await Promise.all([
      // Grand total: all applicants regardless of filter
      supabase.from('applicants').select('*', { count: 'exact', head: true }),
      // Month/source-filtered applicants for stats
      statsQuery,
      // UTM links for label matching
      supabase.from('utm_links').select('*').order('created_at', { ascending: false }),
      // Recruitment settings: for months list + active month determination
      supabase
        .from('recruitment_settings')
        .select('challenge_month, is_open, open_at, close_at')
        .order('challenge_month', { ascending: false }),
      // All applicant challenge_months (distinct) for dropdown
      supabase
        .from('applicants')
        .select('challenge_month')
        .not('challenge_month', 'is', null),
    ]);

    if (applicantsResult.error) {
      return Response.json({ error: applicantsResult.error.message }, { status: 500 });
    }

    const applicants: ApplicantUtm[] = applicantsResult.data ?? [];
    const utmLinks: UtmLink[] = utmLinksResult.data ?? [];
    const recruitmentSettings: RecruitmentSetting[] = recruitmentResult.data ?? [];

    // 활성 모집 판단: lib/recruitment.ts + api/admin/recruitment 와 동일한 기준
    const now = new Date().toISOString();
    const activeSetting = recruitmentSettings.find(s => {
      if (!s.is_open) return false;
      if (!s.challenge_month) return false;
      if (s.open_at && now < s.open_at) return false;
      if (s.close_at && now >= s.close_at) return false;
      return true;
    });
    const activeMonth = activeSetting?.challenge_month ?? null;

    // Merge months from recruitment_settings and actual applicants (for dropdown)
    const recruitmentMonths = recruitmentSettings
      .map(s => s.challenge_month)
      .filter((m): m is string => !!m);

    const applicantMonths = (applicantMonthsResult.data ?? [])
      .map((a: { challenge_month: string | null }) => a.challenge_month)
      .filter((m): m is string => !!m);

    const challengeMonths = [...new Set([...recruitmentMonths, ...applicantMonths])]
      .sort()
      .reverse();

    // Latest applicant month for step-3 fallback (when no recruitment settings exist)
    const latestApplicantMonth = challengeMonths.find(m => applicantMonths.includes(m)) ?? null;

    const grandTotal = grandTotalResult.count ?? 0;
    const total = applicants.length;
    const withUtm = applicants.filter(a => a.utm_source !== null).length;
    const withoutUtm = total - withUtm;

    // Group by UTM combination
    const groupMap = new Map<string, {
      utm_source: string | null;
      utm_medium: string | null;
      utm_campaign: string | null;
      utm_content: string | null;
      count: number;
    }>();

    for (const a of applicants) {
      const key = [
        a.utm_source ?? '',
        a.utm_medium ?? '',
        a.utm_campaign ?? '',
        a.utm_content ?? '',
      ].join('|');
      const existing = groupMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        groupMap.set(key, {
          utm_source: a.utm_source,
          utm_medium: a.utm_medium,
          utm_campaign: a.utm_campaign,
          utm_content: a.utm_content,
          count: 1,
        });
      }
    }

    const breakdown = [...groupMap.values()]
      .sort((a, b) => b.count - a.count)
      .map(group => {
        const matchedLink = group.utm_content
          ? utmLinks.find(l => l.content === group.utm_content)
          : null;
        const percentage = total > 0 ? Math.round((group.count / total) * 1000) / 10 : 0;
        return {
          utm_source: group.utm_source,
          utm_medium: group.utm_medium,
          utm_campaign: group.utm_campaign,
          utm_content: group.utm_content,
          count: group.count,
          label: matchedLink?.label ?? null,
          percentage,
        };
      });

    return Response.json({
      stats: {
        grand_total: grandTotal,
        total,
        with_utm: withUtm,
        without_utm: withoutUtm,
        breakdown,
      },
      utm_links: utmLinks,
      challenge_months: challengeMonths,
      active_month: activeMonth,
      latest_applicant_month: latestApplicantMonth,
    });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : '서버 오류' }, { status: 500 });
  }
}
