'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────
type Status = 'applied' | 'paid' | 'cancelled';

interface Applicant {
  id: string;
  aid: string | null;
  nickname: string | null;
  email: string;
  phone: string | null;
  blog_url: string | null;
  class_type: string | null;
  writing_goal: number | null;
  personal_goal: number | null;
  goal: string | null;
  privacy_agreed: boolean | null;
  is_overseas_resident: boolean | null;
  is_first_time: boolean | null;
  status: Status | null;
  memo: string | null;
  challenge_month: string | null;
  created_at: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  referrer_url: string | null;
  landing_url: string | null;
}

interface FormValues {
  aid: string;
  nickname: string;
  email: string;
  phone: string;
  blog_url: string;
  class_type: string;
  status: string;
  memo: string;
  is_overseas_resident: boolean;
  is_first_time: boolean;
  challenge_month: string;
}

// ── Constants ──────────────────────────────────────────────────────────────
const SOURCE_LABELS: Record<string, string> = {
  email: '이메일',
  kakao_openchat: '단톡방',
  lms: 'LMS',
  instagram: '인스타그램',
  etc: '기타',
};

const STATUS_LABELS: Record<string, string> = {
  applied: '신청완료',
  paid: '입금완료',
  cancelled: '취소',
};

const STATUS_SELECT_CLASS: Record<string, string> = {
  applied: 'bg-[#28B8D1]/10 text-[#28B8D1] border-[#28B8D1]/20',
  paid: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-[#FF7789]/10 text-[#FF7789] border-[#FF7789]/20',
};

const CLASS_SELECT_CLASS: Record<string, string> = {
  '베이직반': 'bg-[#28B8D1]/10 text-[#28B8D1] border-[#28B8D1]/20',
  '부스터반': 'bg-purple-100 text-purple-600 border-purple-200',
};

const EMPTY_FORM: FormValues = {
  aid: '',
  nickname: '',
  email: '',
  phone: '',
  blog_url: '',
  class_type: '',
  status: 'applied',
  memo: '',
  is_overseas_resident: false,
  is_first_time: false,
  challenge_month: '',
};

function formatChallengeMonth(month: string): string {
  const [year, m] = month.split('-');
  if (!year || !m) return month;
  return `${year}년 ${parseInt(m, 10)}월`;
}

function formatDateTime(dateStr: string) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const kst = new Date(new Date(dateStr).getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}.${pad(kst.getUTCMonth() + 1)}.${pad(kst.getUTCDate())} ${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`;
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function ApplicantsPage() {
  // Data
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [classFilter, setClassFilter] = useState('all');
  const [overseasFilter, setOverseasFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [firstTimeFilter, setFirstTimeFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [challengeMonthFilter, setChallengeMonthFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [showDuplicates, setShowDuplicates] = useState(false);

  // Recruitment months from settings (for filter and form default)
  const [recruitmentMonths, setRecruitmentMonths] = useState<string[]>([]);
  const [currentRecruitmentMonth, setCurrentRecruitmentMonth] = useState('');

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Selection + bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMemo, setBulkMemo] = useState('');

  // Inline cell updating
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  // Modal
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [formValues, setFormValues] = useState<FormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // ── Data fetching ────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/admin/applicants');
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? '데이터를 불러오지 못했습니다.');
      }
      const json = await res.json() as { data: Applicant[] };
      setApplicants(json.data ?? []);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    fetch('/api/admin/recruitment')
      .then(r => r.json())
      .then((d: {
        settings?: Array<{ challenge_month?: string | null }>;
        activeSettings?: { challenge_month?: string | null };
      }) => {
        const months = (d.settings ?? [])
          .map(s => s.challenge_month)
          .filter((m): m is string => !!m);
        setRecruitmentMonths(months);
        const sorted = [...months].sort().reverse();
        const activeMonth = d.activeSettings?.challenge_month ?? null;
        const latestMonth = sorted[0] ?? null;
        const defaultMonth = activeMonth ?? latestMonth ?? 'all';
        // 신청자 추가 폼 기본값
        setCurrentRecruitmentMonth(defaultMonth !== 'all' ? defaultMonth : (sorted[0] ?? ''));
        // 월 필터 기본값: 현재 모집월 (없으면 가장 최신, 그래도 없으면 전체)
        setChallengeMonthFilter(defaultMonth);
      })
      .catch(() => setChallengeMonthFilter('all'));
  }, []);

  // ── Derived state ────────────────────────────────────────────────────────
  // 같은 challenge_month 안에서 aid 또는 nickname이 중복되는 신청자 id Set
  const withinMonthDuplicateIds = useMemo(() => {
    const byMonth: Record<string, Applicant[]> = {};
    for (const a of applicants) {
      const m = a.challenge_month ?? '__none__';
      (byMonth[m] ??= []).push(a);
    }
    const dupIds = new Set<string>();
    for (const group of Object.values(byMonth)) {
      const aidMap: Record<string, string[]> = {};
      const nickMap: Record<string, string[]> = {};
      for (const a of group) {
        if (a.aid) (aidMap[a.aid] ??= []).push(a.id);
        if (a.nickname) (nickMap[a.nickname] ??= []).push(a.id);
      }
      for (const ids of Object.values(aidMap)) {
        if (ids.length > 1) ids.forEach(id => dupIds.add(id));
      }
      for (const ids of Object.values(nickMap)) {
        if (ids.length > 1) ids.forEach(id => dupIds.add(id));
      }
    }
    return dupIds;
  }, [applicants]);

  // 상단 통계 카드는 월 필터 기준으로만 집계
  const monthFilteredApplicants = useMemo(() => {
    if (!challengeMonthFilter || challengeMonthFilter === 'all') return applicants;
    return applicants.filter(a => a.challenge_month === challengeMonthFilter);
  }, [applicants, challengeMonthFilter]);

  const summary = useMemo(() => ({
    total: monthFilteredApplicants.length,
    applied: monthFilteredApplicants.filter(a => a.status === 'applied').length,
    paid: monthFilteredApplicants.filter(a => a.status === 'paid').length,
    cancelled: monthFilteredApplicants.filter(a => a.status === 'cancelled').length,
    duplicates: monthFilteredApplicants.filter(a => withinMonthDuplicateIds.has(a.id)).length,
  }), [monthFilteredApplicants, withinMonthDuplicateIds]);

  // 모집 설정에 등록된 월 + 기존 신청자 데이터의 월 (정렬: 최신순)
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    for (const m of recruitmentMonths) months.add(m);
    for (const a of applicants) {
      if (a.challenge_month) months.add(a.challenge_month);
    }
    return [...months].sort().reverse();
  }, [applicants, recruitmentMonths]);

  const filtered = useMemo(() => {
    let list = showDuplicates
      ? applicants.filter(a => withinMonthDuplicateIds.has(a.id))
      : [...applicants];

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(a =>
        (a.aid ?? '').toLowerCase().includes(q) ||
        (a.nickname ?? '').toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.phone ?? '').toLowerCase().includes(q) ||
        (a.blog_url ?? '').toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') list = list.filter(a => a.status === statusFilter);
    if (classFilter !== 'all') list = list.filter(a => a.class_type === classFilter);
    if (overseasFilter !== 'all') list = list.filter(a =>
      overseasFilter === 'yes' ? a.is_overseas_resident === true : !a.is_overseas_resident
    );
    if (firstTimeFilter !== 'all') list = list.filter(a =>
      firstTimeFilter === 'yes' ? a.is_first_time === true : !a.is_first_time
    );

    if (challengeMonthFilter !== null && challengeMonthFilter !== 'all') list = list.filter(a => a.challenge_month === challengeMonthFilter);

    if (sourceFilter !== 'all') {
      if (sourceFilter === 'none') {
        list = list.filter(a => !a.utm_source);
      } else {
        list = list.filter(a => a.utm_source === sourceFilter);
      }
    }

    return list;
  }, [applicants, search, statusFilter, classFilter, overseasFilter, firstTimeFilter, challengeMonthFilter, sourceFilter, showDuplicates, withinMonthDuplicateIds]);

  // ── Selection ────────────────────────────────────────────────────────────
  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filtered.length;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(a => a.id)));
    }
  };

  // ── Inline status change ─────────────────────────────────────────────────
  const handleInlineStatusChange = async (applicant: Applicant, newStatus: Status) => {
    const prevStatus = applicant.status;
    setApplicants(prev =>
      prev.map(a => a.id === applicant.id ? { ...a, status: newStatus } : a)
    );
    setUpdatingIds(prev => new Set(prev).add(applicant.id));
    try {
      const res = await fetch(`/api/admin/applicants/${applicant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? '저장 실패');
      }
    } catch (e) {
      setApplicants(prev =>
        prev.map(a => a.id === applicant.id ? { ...a, status: prevStatus } : a)
      );
      alert(e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setUpdatingIds(prev => { const n = new Set(prev); n.delete(applicant.id); return n; });
    }
  };

  // ── Inline class_type change ─────────────────────────────────────────────
  const handleInlineClassChange = async (applicant: Applicant, newClass: string) => {
    const prevClass = applicant.class_type;
    const prevWritingGoal = applicant.writing_goal;
    const prevPersonalGoal = applicant.personal_goal;
    const newWritingGoal = newClass === '부스터반' ? 5 : newClass === '베이직반' ? 3 : null;
    const newPersonalGoal = newClass ? 1 : null;

    setApplicants(prev =>
      prev.map(a => a.id === applicant.id
        ? { ...a, class_type: newClass || null, writing_goal: newWritingGoal, personal_goal: newPersonalGoal }
        : a
      )
    );
    setUpdatingIds(prev => new Set(prev).add(applicant.id));
    try {
      const res = await fetch(`/api/admin/applicants/${applicant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_type: newClass }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? '저장 실패');
      }
    } catch (e) {
      setApplicants(prev =>
        prev.map(a => a.id === applicant.id
          ? { ...a, class_type: prevClass, writing_goal: prevWritingGoal, personal_goal: prevPersonalGoal }
          : a
        )
      );
      alert(e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setUpdatingIds(prev => { const n = new Set(prev); n.delete(applicant.id); return n; });
    }
  };

  // ── Bulk memo ────────────────────────────────────────────────────────────
  const handleBulkMemo = async () => {
    if (!window.confirm(`선택한 ${selectedIds.size}명의 메모를 동일하게 변경하시겠습니까?`)) return;
    try {
      const res = await fetch('/api/admin/applicants/bulk-memo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selectedIds], memo: bulkMemo }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? '오류가 발생했습니다.');
      }
      setBulkMemo('');
      setSelectedIds(new Set());
      await fetchData();
    } catch (e) {
      alert(e instanceof Error ? e.message : '알 수 없는 오류');
    }
  };

  // ── Bulk paid ────────────────────────────────────────────────────────────
  const handleBulkPaid = async () => {
    if (!window.confirm(`선택한 ${selectedIds.size}명을 입금완료로 변경하시겠습니까?`)) return;
    try {
      const res = await fetch('/api/admin/applicants/bulk-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selectedIds], status: 'paid' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? '오류가 발생했습니다.');
      }
      setSelectedIds(new Set());
      await fetchData();
    } catch (e) {
      alert(e instanceof Error ? e.message : '알 수 없는 오류');
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/applicants/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? '삭제 실패');
      }
      setDeleteConfirmId(null);
      await fetchData();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Modal ────────────────────────────────────────────────────────────────
  const openAdd = () => {
    setFormValues({ ...EMPTY_FORM, challenge_month: currentRecruitmentMonth });
    setFormError(null);
    setEditingId(null);
    setModalMode('add');
  };

  const openEdit = (applicant: Applicant) => {
    setFormValues({
      aid: applicant.aid ?? '',
      nickname: applicant.nickname ?? '',
      email: applicant.email,
      phone: applicant.phone ?? '',
      blog_url: applicant.blog_url ?? '',
      class_type: applicant.class_type ?? '',
      status: applicant.status ?? 'applied',
      memo: applicant.memo ?? '',
      is_overseas_resident: applicant.is_overseas_resident ?? false,
      is_first_time: applicant.is_first_time ?? false,
      challenge_month: applicant.challenge_month ?? '',
    });
    setFormError(null);
    setEditingId(applicant.id);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setFormError(null);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const val: unknown = target.type === 'checkbox' ? target.checked : target.value;
    setFormValues(prev => ({ ...prev, [target.name]: val } as FormValues));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValues.email) {
      setFormError('이메일은 필수입니다.');
      return;
    }
    setFormLoading(true);
    setFormError(null);
    try {
      const url = modalMode === 'edit' && editingId
        ? `/api/admin/applicants/${editingId}`
        : '/api/admin/applicants';
      const method = modalMode === 'edit' ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? '저장 실패');
      }
      closeModal();
      await fetchData();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setFormLoading(false);
    }
  };

  // ── CSV download ─────────────────────────────────────────────────────────
  const downloadCSV = () => {
    const headers = [
      'AID', '이름', '이메일', '휴대폰', '블로그 URL',
      '참여 반', '전체 글 목표', '제휴링크 콘텐츠 목표', '상태', '해외거주', '첫 참여 여부', '챌린지 월', '메모', '신청일시',
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'referrer_url', 'landing_url',
    ];
    const rows = filtered.map(a => [
      a.aid ?? '',
      a.nickname ?? '',
      a.email,
      a.phone ?? '',
      a.blog_url ?? '',
      a.class_type ?? '',
      String(a.writing_goal ?? ''),
      String(a.personal_goal ?? ''),
      STATUS_LABELS[a.status ?? ''] ?? '',
      a.is_overseas_resident ? 'Y' : 'N',
      a.is_first_time ? '첫 참여' : '기존/미체크',
      a.challenge_month ?? '',
      a.memo ?? '',
      formatDateTime(a.created_at),
      a.utm_source ?? '',
      a.utm_medium ?? '',
      a.utm_campaign ?? '',
      a.utm_content ?? '',
      a.referrer_url ?? '',
      a.landing_url ?? '',
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `applicants-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // ── AID warning (for modal) ───────────────────────────────────────────────
  const aidWarning = formValues.aid !== '' && !/^\d{6}$/.test(formValues.aid);

  // ── Loading / error states ────────────────────────────────────────────────
  if (loading || challengeMonthFilter === null) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#28B8D1] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center flex-col gap-3">
        <p className="text-[#FF7789] text-sm">{fetchError}</p>
        <button onClick={fetchData} className="text-sm text-[#28B8D1] underline">
          다시 시도
        </button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">세시간전 습관챌린지</p>
            <h1 className="text-2xl font-bold text-[#1a1a2e]">신청자 관리</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={downloadCSV}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:border-[#28B8D1] hover:text-[#28B8D1] transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              CSV 다운로드
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#28B8D1] text-white text-sm font-semibold hover:bg-[#1fa8bf] transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              신청자 추가
            </button>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <p className="text-xs text-gray-400 mb-2 font-medium">
          {challengeMonthFilter === 'all'
            ? '전체 기간 기준 집계'
            : `${formatChallengeMonth(challengeMonthFilter)} 기준 집계`}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
          {[
            { label: '전체 신청자', value: summary.total, color: 'text-[#1a1a2e]', dot: 'bg-gray-300' },
            { label: '신청완료', value: summary.applied, color: 'text-[#28B8D1]', dot: 'bg-[#28B8D1]' },
            { label: '입금완료', value: summary.paid, color: 'text-green-600', dot: 'bg-green-500' },
            { label: '취소', value: summary.cancelled, color: 'text-[#FF7789]', dot: 'bg-[#FF7789]' },
            { label: challengeMonthFilter === 'all' ? '전체 기준 중복 의심' : '월내 중복 의심', value: summary.duplicates, color: 'text-amber-500', dot: 'bg-amber-400' },
          ].map(({ label, value, color, dot }) => (
            <div
              key={label}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col gap-1"
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                <p className="text-xs text-gray-400 font-medium">{label}</p>
              </div>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="flex flex-wrap gap-3">
            <select
              value={challengeMonthFilter ?? 'all'}
              onChange={e => setChallengeMonthFilter(e.target.value)}
              className="border border-[#28B8D1]/40 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-[#28B8D1]/5 text-[#28B8D1] font-medium"
            >
              <option value="all">전체 월</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{formatChallengeMonth(m)}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="AID, 이름, 이메일, 휴대폰, 블로그 URL 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-[220px] border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#28B8D1] transition-colors"
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as 'all' | Status)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-600"
            >
              <option value="all">전체 상태</option>
              <option value="applied">신청완료</option>
              <option value="paid">입금완료</option>
              <option value="cancelled">취소</option>
            </select>
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-600"
            >
              <option value="all">전체 반</option>
              <option value="베이직반">베이직반</option>
              <option value="부스터반">부스터반</option>
            </select>
            <select
              value={overseasFilter}
              onChange={e => setOverseasFilter(e.target.value as 'all' | 'yes' | 'no')}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-600"
            >
              <option value="all">해외 전체</option>
              <option value="yes">해외 체크</option>
              <option value="no">해외 미체크</option>
            </select>
            <select
              value={firstTimeFilter}
              onChange={e => setFirstTimeFilter(e.target.value as 'all' | 'yes' | 'no')}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-600"
            >
              <option value="all">첫참여 전체</option>
              <option value="yes">첫 참여 체크</option>
              <option value="no">첫 참여 미체크</option>
            </select>
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-600"
            >
              <option value="all">유입 전체</option>
              <option value="email">이메일</option>
              <option value="kakao_openchat">단톡방</option>
              <option value="lms">LMS</option>
              <option value="instagram">인스타그램</option>
              <option value="etc">기타</option>
              <option value="none">출처 없음</option>
            </select>
            <button
              onClick={() => setShowDuplicates(v => !v)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                showDuplicates
                  ? 'bg-amber-50 border-amber-300 text-amber-600'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-500'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {showDuplicates ? '중복 의심만 보는 중' : '중복 의심만 보기'}
            </button>
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-400 text-sm hover:border-gray-300 hover:text-gray-500 transition-colors"
              title="새로고침"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Bulk Actions Bar ── */}
        {selectedIds.size > 0 && (
          <div className="bg-white rounded-2xl border border-[#28B8D1]/30 shadow-sm p-4 mb-4">
            <p className="text-xs font-semibold text-[#28B8D1] mb-2">
              {selectedIds.size}명 선택됨 — 일괄 작업
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {/* Bulk paid button */}
              <button
                onClick={handleBulkPaid}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#28B8D1] text-white text-sm font-semibold rounded-xl hover:bg-[#1fa8bf] transition-colors shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                선택한 신청자 입금완료 처리
              </button>

              {/* Divider */}
              <span className="w-px h-6 bg-gray-200 mx-1" />

              {/* Bulk memo */}
              <input
                type="text"
                placeholder="예: 5/27 입금확인"
                value={bulkMemo}
                onChange={e => setBulkMemo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && bulkMemo.trim() && handleBulkMemo()}
                className="flex-1 min-w-[180px] border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1]"
              />
              <button
                onClick={handleBulkMemo}
                disabled={!bulkMemo.trim()}
                className="px-4 py-2 bg-gray-700 text-white text-sm font-semibold rounded-xl disabled:opacity-40 hover:bg-gray-800 transition-colors"
              >
                메모 일괄 적용
              </button>

              {/* Deselect */}
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-2 border border-gray-200 text-gray-400 text-sm rounded-xl hover:border-gray-300 transition-colors"
              >
                선택 해제
              </button>
            </div>
          </div>
        )}

        {/* ── Table ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="px-3 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleSelectAll}
                      className="rounded accent-[#28B8D1] cursor-pointer"
                    />
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-16">AID</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-20">이름</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">이메일</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">휴대폰</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">블로그 URL</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">참여 반</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">상태</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide" title="해외 거주/체류 여부">해외</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide" title="첫 참여 여부">첫 참여</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">유입 출처</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">메모</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">신청일시</th>
                  <th className="px-3 py-3 w-14" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="text-center py-14 text-gray-300 text-sm">
                      신청자가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filtered.map(a => {
                    const isDup = withinMonthDuplicateIds.has(a.id);
                    const isSelected = selectedIds.has(a.id);
                    const isUpdating = updatingIds.has(a.id);
                    return (
                      <tr
                        key={a.id}
                        className={`border-b border-gray-50 transition-colors ${
                          isSelected ? 'bg-[#28B8D1]/5' : 'hover:bg-gray-50/70'
                        }`}
                      >
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(a.id)}
                            className="rounded accent-[#28B8D1] cursor-pointer"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openEdit(a)}
                              className="font-mono text-[#28B8D1] underline underline-offset-2 cursor-pointer hover:text-[#1fa8bf] transition-colors"
                              role="button"
                              aria-label={`${a.aid ?? '-'} 수정`}
                            >
                              {a.aid ?? <span className="text-gray-300">-</span>}
                            </button>
                            {isDup && (
                              <span className="inline-flex text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-semibold leading-tight">
                                {challengeMonthFilter === 'all' ? '전체 기준 중복 의심' : '월내 중복 의심'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-3 font-medium text-[#1a1a2e]">
                          {a.nickname ?? <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-3 py-3 text-gray-500">{a.email}</td>
                        <td className="px-3 py-3 text-gray-500">
                          {a.phone ?? <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-3 py-3 max-w-[160px]">
                          {a.blog_url ? (
                            <a
                              href={a.blog_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={a.blog_url}
                              className="text-[#28B8D1] hover:underline block truncate"
                            >
                              {a.blog_url}
                            </a>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>

                        {/* ── 참여 반 인라인 드롭다운 ── */}
                        <td className="px-3 py-2.5">
                          <select
                            value={a.class_type ?? ''}
                            disabled={isUpdating}
                            onChange={e => handleInlineClassChange(a, e.target.value)}
                            className={`text-xs rounded-lg px-2 py-1 border font-medium focus:outline-none transition-colors ${
                              isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                            } ${CLASS_SELECT_CLASS[a.class_type ?? ''] ?? 'bg-gray-50 text-gray-400 border-gray-200'}`}
                          >
                            <option value="">미선택</option>
                            <option value="베이직반">베이직반</option>
                            <option value="부스터반">부스터반</option>
                          </select>
                        </td>

                        {/* ── 상태 인라인 드롭다운 ── */}
                        <td className="px-3 py-2.5">
                          <select
                            value={a.status ?? ''}
                            disabled={isUpdating}
                            onChange={e => handleInlineStatusChange(a, e.target.value as Status)}
                            className={`text-xs rounded-lg px-2 py-1 border font-medium focus:outline-none transition-colors ${
                              isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                            } ${STATUS_SELECT_CLASS[a.status ?? ''] ?? 'bg-gray-50 text-gray-400 border-gray-200'}`}
                          >
                            <option value="applied">신청완료</option>
                            <option value="paid">입금완료</option>
                            <option value="cancelled">취소</option>
                          </select>
                        </td>

                        {/* 해외 거주/체류 */}
                        <td className="px-3 py-3 text-center">
                          {a.is_overseas_resident ? (
                            <span className="inline-flex items-center text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-semibold">
                              해외
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>

                        {/* 첫 참여 여부 */}
                        <td className="px-3 py-3 text-center">
                          {a.is_first_time ? (
                            <span className="inline-flex items-center text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-semibold">
                              첫 참여
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>

                        {/* 유입 출처 */}
                        <td className="px-3 py-3">
                          {a.utm_source ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#28B8D1]/10 text-[#28B8D1] w-fit">
                                {SOURCE_LABELS[a.utm_source] ?? a.utm_source}
                              </span>
                              {a.utm_content && (
                                <span className="text-[10px] text-gray-400 font-mono">{a.utm_content}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-300">출처 없음</span>
                          )}
                        </td>

                        <td className="px-3 py-3 text-gray-500 max-w-[180px] truncate" title={a.memo ?? ''}>
                          {a.memo ?? <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-3 py-3 text-gray-400 text-xs">
                          {formatDateTime(a.created_at)}
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => { setDeleteConfirmId(a.id); setDeleteError(null); }}
                            className="text-xs px-2 py-1 rounded-lg border border-[#FF7789]/30 text-[#FF7789] hover:bg-[#FF7789]/5 transition-colors whitespace-nowrap"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {filtered.length}명 표시 중
              {filtered.length !== applicants.length && ` (전체 ${applicants.length}명)`}
            </p>
            {selectedIds.size > 0 && (
              <p className="text-xs text-[#28B8D1] font-medium">{selectedIds.size}명 선택됨</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirmId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={e => { if (e.target === e.currentTarget && !deleteLoading) setDeleteConfirmId(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#FF7789]/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#FF7789]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-[#1a1a2e] text-base">신청자 삭제</h3>
                <p className="text-xs text-gray-400 mt-0.5">이 작업은 되돌릴 수 없습니다</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              이 신청자를 삭제할까요? 삭제 후 복구할 수 없습니다.
            </p>
            {deleteError && (
              <p className="text-xs text-[#FF7789] bg-[#FF7789]/5 rounded-xl px-3 py-2 mb-3">
                {deleteError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setDeleteConfirmId(null); setDeleteError(null); }}
                disabled={deleteLoading}
                className="flex-1 border border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm font-medium hover:border-gray-300 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={deleteLoading}
                className="flex-1 bg-[#FF7789] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#ff5f72] disabled:opacity-50 transition-colors"
              >
                {deleteLoading ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {modalMode !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-base font-bold text-[#1a1a2e]">
                {modalMode === 'add' ? '신청자 추가' : '신청자 수정'}
              </h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleFormSubmit} className="px-6 py-5 space-y-4">

              {/* AID */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  세시간전 AID
                  <span className="ml-1 font-normal text-gray-400">(숫자 6자리 권장)</span>
                </label>
                <input
                  name="aid"
                  type="text"
                  value={formValues.aid}
                  onChange={handleFormChange}
                  placeholder="예: 123456"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] transition-colors"
                />
                {aidWarning && (
                  <p className="text-xs text-amber-500 mt-1.5 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    AID는 숫자 6자리를 권장합니다. 그래도 저장할 수 있습니다.
                  </p>
                )}
              </div>

              {/* Nickname */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  이름
                  <span className="ml-1 font-normal text-gray-400">(입금자명과 동일하게)</span>
                </label>
                <input
                  name="nickname"
                  type="text"
                  value={formValues.nickname}
                  onChange={handleFormChange}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] transition-colors"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  이메일
                  <span className="ml-1 text-[#FF7789]">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  value={formValues.email}
                  onChange={handleFormChange}
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] transition-colors"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">휴대폰 번호</label>
                <input
                  name="phone"
                  type="tel"
                  value={formValues.phone}
                  onChange={handleFormChange}
                  placeholder="010-0000-0000"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] transition-colors"
                />
              </div>

              {/* Blog URL */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">블로그 URL</label>
                <input
                  name="blog_url"
                  type="text"
                  value={formValues.blog_url}
                  onChange={handleFormChange}
                  placeholder="https://blog.naver.com/..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] transition-colors"
                />
              </div>

              {/* Class Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">참여 반</label>
                <select
                  name="class_type"
                  value={formValues.class_type}
                  onChange={handleFormChange}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-700"
                >
                  <option value="">선택 안 함</option>
                  <option value="베이직반">베이직반</option>
                  <option value="부스터반">부스터반</option>
                </select>
                {formValues.class_type && (
                  <p className="text-xs text-gray-400 mt-1">
                    {formValues.class_type === '베이직반'
                      ? '글 목표 3회 · 제휴 목표 1회로 자동 설정됩니다.'
                      : '글 목표 5회 · 제휴 목표 1회로 자동 설정됩니다.'}
                  </p>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">상태</label>
                <select
                  name="status"
                  value={formValues.status}
                  onChange={handleFormChange}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-700"
                >
                  <option value="applied">신청완료</option>
                  <option value="paid">입금완료</option>
                  <option value="cancelled">취소</option>
                </select>
              </div>

              {/* First Time */}
              <div className="bg-gray-50 rounded-xl p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_first_time"
                    checked={formValues.is_first_time}
                    onChange={handleFormChange}
                    className="w-4 h-4 rounded border-gray-300 accent-[#28B8D1] cursor-pointer flex-shrink-0"
                  />
                  <span className="text-sm text-gray-600">
                    <span className="font-semibold text-[#1a1a2e]">첫 참여 여부</span>
                    <span className="ml-1 text-xs text-gray-400">— 습관챌린지 첫 참여자인 경우 체크</span>
                  </span>
                </label>
              </div>

              {/* Overseas */}
              <div className="bg-gray-50 rounded-xl p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_overseas_resident"
                    checked={formValues.is_overseas_resident}
                    onChange={handleFormChange}
                    className="w-4 h-4 rounded border-gray-300 accent-[#28B8D1] cursor-pointer flex-shrink-0"
                  />
                  <span className="text-sm text-gray-600">
                    <span className="font-semibold text-[#1a1a2e]">해외 거주/체류 여부</span>
                    <span className="ml-1 text-xs text-gray-400">— 이메일 추가 발송 대상</span>
                  </span>
                </label>
              </div>

              {/* Challenge Month */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  챌린지 월
                  <span className="ml-1 font-normal text-gray-400">(예: 2026-07)</span>
                </label>
                <select
                  name="challenge_month"
                  value={formValues.challenge_month}
                  onChange={handleFormChange}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-700"
                >
                  <option value="">선택 안 함</option>
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{formatChallengeMonth(m)}</option>
                  ))}
                </select>
              </div>

              {/* Memo */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">메모</label>
                <textarea
                  name="memo"
                  value={formValues.memo}
                  onChange={handleFormChange}
                  rows={3}
                  placeholder="관리자 메모 입력"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] resize-none transition-colors"
                />
              </div>

              {/* Error */}
              {formError && (
                <p className="text-xs text-[#FF7789] bg-[#FF7789]/5 rounded-xl px-3 py-2">
                  {formError}
                </p>
              )}

              {/* Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 border border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm font-medium hover:border-gray-300 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 bg-[#28B8D1] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1fa8bf] disabled:opacity-50 transition-colors"
                >
                  {formLoading ? '저장 중...' : modalMode === 'add' ? '추가' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
