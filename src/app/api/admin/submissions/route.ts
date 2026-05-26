import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

// ── Types ──────────────────────────────────────────────────────────────────

interface Applicant {
  id: string;
  aid: string | null;
  nickname: string | null;
  email: string;
  phone: string | null;
  class_type: string | null;
  writing_goal: number | null;
  personal_goal: number | null;
  status: 'applied' | 'paid' | 'cancelled' | null;
}

export interface LovableSubmissionItem {
  contentUrl: string;
  submittedAt: string;
  postDate: string;
  week: number;
  hasAffiliateLink: boolean;
  status: string;
  adminComment: string | null;
}

interface LovableEntry {
  aid: string;
  challengeId: string;
  week: number;
  submittedCount: number;
  approvedCount: number;
  affiliateContentCount: number;
  writingGoal: number;
  personalGoal: number;
  isCompleted: boolean;
  lastSubmittedAt: string;
  submissions: LovableSubmissionItem[];
}

export interface MergedRow {
  aid: string;
  applicantId: string | null;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  class_type: string | null;
  applicantStatus: 'applied' | 'paid' | 'cancelled' | null;
  hasApplicantData: boolean;
  week: number | null;
  submittedCount: number;
  approvedCount: number;
  affiliateContentCount: number;
  writingGoal: number | null;
  personalGoal: number | null;
  isCompleted: boolean | null;
  lastSubmittedAt: string | null;
  submissions: LovableSubmissionItem[];
  hasLovableData: boolean;
}

// ── Month → Challenge ID map (월별 challengeId 추가 시 여기에 등록) ──────────

const CHALLENGE_MAP: Record<string, string | undefined> = {
  '2026-05': process.env.LOVABLE_CHALLENGE_ID,
  // '2026-06': process.env.LOVABLE_CHALLENGE_ID_2026_06,
  // '2026-07': process.env.LOVABLE_CHALLENGE_ID_2026_07,
};

// ── Helpers ────────────────────────────────────────────────────────────────

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  return createClient(url, key);
}

async function fetchLovable(challengeId: string, week?: string): Promise<LovableEntry[]> {
  const apiUrl = process.env.LOVABLE_SUBMISSION_API_URL;
  const apiKey = process.env.LOVABLE_ADMIN_API_KEY;
  if (!apiUrl || !apiKey) {
    throw new Error('Lovable API 환경변수가 설정되지 않았습니다.');
  }

  const params = new URLSearchParams({ challengeId });
  if (week && week !== 'all') params.set('week', week);

  const res = await fetch(`${apiUrl}?${params.toString()}`, {
    headers: { 'x-admin-api-key': apiKey },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Lovable API 오류: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<LovableEntry[]>;
}

// ── Route Handler ──────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const month = sp.get('month') ?? '2026-05';
    const week = sp.get('week') ?? undefined;

    const challengeId = CHALLENGE_MAP[month];
    if (!challengeId) {
      return Response.json({ data: [], noChallenge: true });
    }

    const supabase = adminClient();

    let lovableError: string | undefined;
    const [applicantsResult, lovableEntries] = await Promise.all([
      supabase
        .from('applicants')
        .select('id, aid, nickname, email, phone, class_type, writing_goal, personal_goal, status')
        .order('created_at', { ascending: false }),
      fetchLovable(challengeId, week).catch((e: unknown) => {
        lovableError = e instanceof Error ? e.message : 'Lovable API 오류';
        return [] as LovableEntry[];
      }),
    ]);

    if (applicantsResult.error) {
      return Response.json({ error: applicantsResult.error.message }, { status: 500 });
    }

    const applicants = (applicantsResult.data ?? []) as Applicant[];

    const lovableMap = new Map<string, LovableEntry>();
    for (const entry of lovableEntries) {
      lovableMap.set(entry.aid, entry);
    }

    const seenAids = new Set<string>();
    const merged: MergedRow[] = [];

    for (const a of applicants) {
      const key = a.aid ?? `__no_aid__${a.id}`;
      seenAids.add(key);
      const lov = a.aid ? lovableMap.get(a.aid) : undefined;
      merged.push({
        aid: a.aid ?? '',
        applicantId: a.id,
        nickname: a.nickname,
        email: a.email,
        phone: a.phone,
        class_type: a.class_type,
        applicantStatus: a.status,
        hasApplicantData: true,
        week: lov?.week ?? null,
        submittedCount: lov?.submittedCount ?? 0,
        approvedCount: lov?.approvedCount ?? 0,
        affiliateContentCount: lov?.affiliateContentCount ?? 0,
        writingGoal: lov?.writingGoal ?? a.writing_goal ?? null,
        personalGoal: lov?.personalGoal ?? a.personal_goal ?? null,
        isCompleted: lov?.isCompleted ?? null,
        lastSubmittedAt: lov?.lastSubmittedAt ?? null,
        submissions: lov?.submissions ?? [],
        hasLovableData: !!lov,
      });
    }

    for (const lov of lovableEntries) {
      if (!seenAids.has(lov.aid)) {
        merged.push({
          aid: lov.aid,
          applicantId: null,
          nickname: null,
          email: null,
          phone: null,
          class_type: null,
          applicantStatus: null,
          hasApplicantData: false,
          week: lov.week,
          submittedCount: lov.submittedCount,
          approvedCount: lov.approvedCount,
          affiliateContentCount: lov.affiliateContentCount,
          writingGoal: lov.writingGoal,
          personalGoal: lov.personalGoal,
          isCompleted: lov.isCompleted,
          lastSubmittedAt: lov.lastSubmittedAt,
          submissions: lov.submissions,
          hasLovableData: true,
        });
      }
    }

    return Response.json({ data: merged, lovableError });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : '서버 오류' }, { status: 500 });
  }
}
