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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const challengeMonth = searchParams.get('challenge_month');
    const utmSource = searchParams.get('utm_source');

    const supabase = adminClient();

    // Grand total (no filters)
    const { count: grandTotal } = await supabase
      .from('applicants')
      .select('*', { count: 'exact', head: true });

    // Filtered applicants for stats
    let query = supabase
      .from('applicants')
      .select('utm_source, utm_medium, utm_campaign, utm_content, challenge_month');

    if (challengeMonth && challengeMonth !== 'all') {
      query = query.eq('challenge_month', challengeMonth);
    }
    if (utmSource && utmSource !== 'all') {
      if (utmSource === 'none') {
        query = query.is('utm_source', null);
      } else {
        query = query.eq('utm_source', utmSource);
      }
    }

    const [applicantsResult, utmLinksResult, recruitmentResult] = await Promise.all([
      query,
      supabase
        .from('utm_links')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('recruitment_settings')
        .select('challenge_month')
        .order('challenge_month', { ascending: false }),
    ]);

    if (applicantsResult.error) {
      return Response.json({ error: applicantsResult.error.message }, { status: 500 });
    }

    const applicants: ApplicantUtm[] = applicantsResult.data ?? [];
    const utmLinks: UtmLink[] = utmLinksResult.data ?? [];

    const challengeMonths = (recruitmentResult.data ?? [])
      .map(s => s.challenge_month)
      .filter((m): m is string => !!m);

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
      const key = [a.utm_source ?? '', a.utm_medium ?? '', a.utm_campaign ?? '', a.utm_content ?? ''].join('|');
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
        grand_total: grandTotal ?? 0,
        total,
        with_utm: withUtm,
        without_utm: withoutUtm,
        breakdown,
      },
      utm_links: utmLinks,
      challenge_months: challengeMonths,
    });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : '서버 오류' }, { status: 500 });
  }
}
