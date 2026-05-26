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
  is_overseas_resident: boolean | null;
  status: 'applied' | 'paid' | 'cancelled' | null;
}

interface LovableEntry {
  aid: string;
  week: number;
  submittedCount: number;
  approvedCount: number;
  affiliateContentCount: number;
  writingGoal: number;
  personalGoal: number;
  isCompleted: boolean;
  lastSubmittedAt: string;
}

export interface TargetPerson {
  aid: string;
  applicantId: string | null;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  class_type: string | null;
  is_overseas_resident: boolean | null;
  status: 'applied' | 'paid' | 'cancelled' | null;
  week: number | null;
  approvedCount: number;
  writingGoal: number | null;
  affiliateContentCount: number;
  personalGoal: number | null;
  lastSubmittedAt: string | null;
  submittedCount: number;
  isCompleted: boolean | null;
}

// ── Challenge map ──────────────────────────────────────────────────────────

const CHALLENGE_MAP: Record<string, string | undefined> = {
  '2026-05': process.env.LOVABLE_CHALLENGE_ID,
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
  if (!apiUrl || !apiKey) throw new Error('Lovable API 환경변수가 설정되지 않았습니다.');

  const params = new URLSearchParams({ challengeId });
  if (week && week !== 'all') params.set('week', week);

  const res = await fetch(`${apiUrl}?${params.toString()}`, {
    headers: { 'x-admin-api-key': apiKey },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Lovable API 오류: ${res.status} ${res.statusText}`);
  return res.json() as Promise<LovableEntry[]>;
}

function toTargetPerson(a: Applicant, lov?: LovableEntry): TargetPerson {
  return {
    aid: a.aid ?? '',
    applicantId: a.id,
    nickname: a.nickname,
    email: a.email,
    phone: a.phone,
    class_type: a.class_type,
    is_overseas_resident: a.is_overseas_resident ?? null,
    status: a.status,
    week: lov?.week ?? null,
    approvedCount: lov?.approvedCount ?? 0,
    writingGoal: lov?.writingGoal ?? a.writing_goal ?? null,
    affiliateContentCount: lov?.affiliateContentCount ?? 0,
    personalGoal: lov?.personalGoal ?? a.personal_goal ?? null,
    lastSubmittedAt: lov?.lastSubmittedAt ?? null,
    submittedCount: lov?.submittedCount ?? 0,
    isCompleted: lov?.isCompleted ?? null,
  };
}

// ── Route Handler ──────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const targetType = sp.get('targetType') ?? '';
    const month = sp.get('month') ?? '2026-05';
    const week = sp.get('week') ?? undefined;
    const classType = sp.get('classType') ?? '';
    const search = sp.get('search') ?? '';

    const supabase = adminClient();

    const { data: rawApplicants, error: appError } = await supabase
      .from('applicants')
      .select('id, aid, nickname, email, phone, class_type, writing_goal, personal_goal, is_overseas_resident, status')
      .order('created_at', { ascending: false });

    if (appError) return Response.json({ error: appError.message }, { status: 500 });
    const applicants = (rawApplicants ?? []) as Applicant[];

    let targets: TargetPerson[] = [];

    if (targetType === 'weekly_incomplete') {
      const challengeId = CHALLENGE_MAP[month];
      if (!challengeId) return Response.json({ data: [], noChallenge: true });

      let lovableEntries: LovableEntry[] = [];
      try {
        lovableEntries = await fetchLovable(challengeId, week);
      } catch {
        // fallback: treat all paid as incomplete
      }

      const lovableMap = new Map<string, LovableEntry>();
      for (const entry of lovableEntries) {
        lovableMap.set(entry.aid, entry);
      }

      for (const a of applicants) {
        if (a.status === 'cancelled' || a.status !== 'paid') continue;
        const lov = a.aid ? lovableMap.get(a.aid) : undefined;
        if (lov?.isCompleted === true) continue;
        targets.push(toTargetPerson(a, lov));
      }
    } else {
      for (const a of applicants) {
        let include = false;
        switch (targetType) {
          case 'payment_request':
          case 'payment_reminder':
            include = a.status === 'applied';
            break;
          case 'payment_completed':
          case 'challenge_start':
          case 'weekly_start':
            include = a.status === 'paid';
            break;
          case 'manual_selected':
            include = a.status !== 'cancelled';
            break;
          default:
            include = a.status !== 'cancelled';
        }
        if (include) targets.push(toTargetPerson(a));
      }
    }

    // classType filter
    if (classType) {
      targets = targets.filter(t => t.class_type === classType);
    }

    // search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      targets = targets.filter(
        t =>
          (t.nickname ?? '').toLowerCase().includes(q) ||
          (t.email ?? '').toLowerCase().includes(q) ||
          (t.phone ?? '').toLowerCase().includes(q) ||
          (t.aid ?? '').toLowerCase().includes(q),
      );
    }

    return Response.json({ data: targets });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : '서버 오류' }, { status: 500 });
  }
}
