'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

interface LovableSubmissionItem {
  contentUrl: string;
  submittedAt: string;
  postDate: string;
  week: number;
  hasAffiliateLink: boolean;
  status: string;
  adminComment: string | null;
}

interface MergedRow {
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

type WeekFilter = 'all' | '1' | '2' | '3';
type CompletionFilter = 'all' | 'achieved' | 'not_achieved' | 'zero' | 'no_affiliate';

// ── Month config (클라이언트용 — challengeId는 서버에서만 관리) ──────────────

interface MonthOption {
  label: string;
  value: string;
}

const MONTH_OPTIONS: MonthOption[] = [
  { label: '2026년 5월', value: '2026-05' },
  { label: '2026년 6월', value: '2026-06' },
  // 추후 월 추가: { label: '2026년 7월', value: '2026-07' },
];

// ── Constants ──────────────────────────────────────────────────────────────

const SUB_STATUS_LABELS: Record<string, string> = {
  approved: '승인',
  rejected: '거절',
  pending: '대기',
};

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(str: string | null) {
  if (!str) return '-';
  return new Date(str).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatDateTime(str: string | null) {
  if (!str) return '-';
  return new Date(str).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function SubmissionsPage() {
  const [rows, setRows] = useState<MergedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lovableWarning, setLovableWarning] = useState<string | null>(null);
  const [noChallenge, setNoChallenge] = useState(false);

  const [monthFilter, setMonthFilter] = useState('2026-05');
  const [weekFilter, setWeekFilter] = useState<WeekFilter>('all');
  const [classFilter, setClassFilter] = useState('all');
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>('all');
  const [search, setSearch] = useState('');

  const [detailRow, setDetailRow] = useState<MergedRow | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (week: WeekFilter, month: string) => {
    setLoading(true);
    setFetchError(null);
    setLovableWarning(null);
    setNoChallenge(false);
    try {
      const params = new URLSearchParams({ month });
      if (week !== 'all') params.set('week', week);
      const res = await fetch(`/api/admin/submissions?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? '데이터를 불러오지 못했습니다.');
      }
      const json = await res.json() as {
        data: MergedRow[];
        lovableError?: string;
        noChallenge?: boolean;
      };
      if (json.noChallenge) {
        setNoChallenge(true);
        setRows([]);
      } else {
        setRows(json.data ?? []);
        if (json.lovableError) setLovableWarning(json.lovableError);
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(weekFilter, monthFilter);
  }, [fetchData, weekFilter, monthFilter]);

  // ── Summary ──────────────────────────────────────────────────────────────

  const summary = useMemo(() => ({
    total: rows.length,
    zero: rows.filter(r => r.submittedCount === 0).length,
    achieved: rows.filter(r => r.isCompleted === true).length,
    notAchieved: rows.filter(r => r.submittedCount > 0 && r.isCompleted !== true).length,
    noAffiliate: rows.filter(
      r => (r.personalGoal ?? 0) > 0 && r.affiliateContentCount < (r.personalGoal ?? 0),
    ).length,
  }), [rows]);

  // ── Client-side filtering ────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = [...rows];

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(r =>
        r.aid.toLowerCase().includes(q) ||
        (r.nickname ?? '').toLowerCase().includes(q) ||
        (r.email ?? '').toLowerCase().includes(q) ||
        (r.phone ?? '').toLowerCase().includes(q),
      );
    }

    if (classFilter !== 'all') {
      list = list.filter(r => r.class_type === classFilter);
    }

    if (completionFilter !== 'all') {
      switch (completionFilter) {
        case 'achieved':
          list = list.filter(r => r.isCompleted === true);
          break;
        case 'not_achieved':
          list = list.filter(r => r.submittedCount > 0 && r.isCompleted !== true);
          break;
        case 'zero':
          list = list.filter(r => r.submittedCount === 0);
          break;
        case 'no_affiliate':
          list = list.filter(
            r => (r.personalGoal ?? 0) > 0 && r.affiliateContentCount < (r.personalGoal ?? 0),
          );
          break;
      }
    }

    return list;
  }, [rows, search, classFilter, completionFilter]);

  // ── CSV Download ─────────────────────────────────────────────────────────

  const downloadCSV = () => {
    const selectedMonth = MONTH_OPTIONS.find(o => o.value === monthFilter)?.label ?? monthFilter;
    const headers = ['AID', '이메일', '이름', '참여반', '주차', '제출', '제휴', '마지막 제출일'];
    const csvRows = filtered.map(r => [
      r.aid || '-',
      r.email || '-',
      r.nickname || '-',
      r.class_type || '-',
      r.week != null ? `${r.week}주차` : '-',
      `${r.approvedCount} / ${r.writingGoal ?? '-'}`,
      `${r.affiliateContentCount} / ${r.personalGoal ?? '-'}`,
      formatDate(r.lastSubmittedAt),
    ]);
    const csv = [headers, ...csvRows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `submissions-${selectedMonth}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // ── Loading / Error ──────────────────────────────────────────────────────

  if (loading) {
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
        <button
          onClick={() => fetchData(weekFilter, monthFilter)}
          className="text-sm text-[#28B8D1] underline"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const selectedMonthLabel = MONTH_OPTIONS.find(o => o.value === monthFilter)?.label ?? monthFilter;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">세시간전 습관챌린지</p>
            <h1 className="text-2xl font-bold text-[#1a1a2e]">제출 현황 관리</h1>
            <p className="text-sm text-gray-400 mt-1">
              신청자 데이터와 제출 시스템 데이터를 AID 기준으로 매칭해 확인합니다.
            </p>
          </div>
          <div className="flex gap-2 mt-1">
            <button
              onClick={downloadCSV}
              disabled={noChallenge || rows.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:border-[#28B8D1] hover:text-[#28B8D1] transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              CSV 다운로드
            </button>
            <button
              onClick={() => fetchData(weekFilter, monthFilter)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-400 text-sm hover:border-gray-300 hover:text-gray-500 transition-colors shadow-sm"
              title="새로고침"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Lovable API Warning ── */}
        {lovableWarning && (
          <div className="mt-3 mb-1 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>제출 현황 API를 불러오지 못했습니다. 신청자 목록만 표시됩니다. ({lovableWarning})</span>
          </div>
        )}

        {/* ── Summary Cards ── */}
        {!noChallenge && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5 mb-5">
            {[
              { label: '전체 대상자 수', value: summary.total, color: 'text-[#1a1a2e]', dot: 'bg-gray-300' },
              { label: '제출 0건', value: summary.zero, color: 'text-gray-500', dot: 'bg-gray-400' },
              { label: '목표 달성', value: summary.achieved, color: 'text-green-600', dot: 'bg-green-500' },
              { label: '목표 미달성', value: summary.notAchieved, color: 'text-[#FF7789]', dot: 'bg-[#FF7789]' },
              { label: '제휴 미제출', value: summary.noAffiliate, color: 'text-amber-500', dot: 'bg-amber-400' },
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
        )}

        {/* ── Filters ── */}
        <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 ${noChallenge ? 'mt-5' : ''} mb-4`}>
          <div className="flex flex-wrap gap-3">
            {/* Month filter — triggers API refetch */}
            <select
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-700 font-medium"
            >
              {MONTH_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Week filter — triggers API refetch */}
            <select
              value={weekFilter}
              onChange={e => setWeekFilter(e.target.value as WeekFilter)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-600"
            >
              <option value="all">전체 주차</option>
              <option value="1">1주차</option>
              <option value="2">2주차</option>
              <option value="3">3주차</option>
            </select>

            {/* Class filter */}
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-600"
            >
              <option value="all">전체 반</option>
              <option value="베이직반">베이직반</option>
              <option value="부스터반">부스터반</option>
            </select>

            {/* Completion filter */}
            <select
              value={completionFilter}
              onChange={e => setCompletionFilter(e.target.value as CompletionFilter)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-600"
            >
              <option value="all">전체 제출 상태</option>
              <option value="achieved">목표 달성</option>
              <option value="not_achieved">목표 미달성</option>
              <option value="zero">제출 0건</option>
              <option value="no_affiliate">제휴 미제출</option>
            </select>

            {/* Search */}
            <input
              type="text"
              placeholder="AID, 이름, 이메일, 휴대폰 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-[200px] border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#28B8D1] transition-colors"
            />
          </div>
        </div>

        {/* ── No Challenge State ── */}
        {noChallenge ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm font-medium">
                아직 연결된 {selectedMonthLabel} 챌린지 데이터가 없습니다.
              </p>
              <p className="text-gray-300 text-xs mt-1">
                서버에 challengeId가 등록되면 바로 조회할 수 있습니다.
              </p>
            </div>
          </div>
        ) : (
          /* ── Table ── */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">AID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">이메일</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">이름</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">참여반</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">주차</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide" title="인정 제출 수 / 전체 목표">제출</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide" title="제휴 콘텐츠 수 / 제휴 목표">제휴</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">마지막 제출일</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">상세</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-14 text-gray-300 text-sm">
                        데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r, idx) => (
                      <tr
                        key={r.applicantId ?? `lov-${r.aid}-${idx}`}
                        className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors"
                      >
                        {/* AID */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-[#1a1a2e] text-xs">
                            {r.aid || <span className="text-gray-300">-</span>}
                          </span>
                        </td>

                        {/* 이메일 */}
                        <td className="px-4 py-3 text-gray-600 text-xs max-w-[180px] truncate" title={r.email ?? ''}>
                          {r.email ?? <span className="text-gray-300">-</span>}
                        </td>

                        {/* 이름 */}
                        <td className="px-4 py-3 font-medium text-[#1a1a2e]">
                          {r.nickname ?? (
                            r.hasApplicantData
                              ? <span className="text-gray-300">-</span>
                              : <span className="text-xs text-gray-400">신청자 정보 없음</span>
                          )}
                        </td>

                        {/* 참여반 */}
                        <td className="px-4 py-3 text-gray-600">
                          {r.class_type ?? <span className="text-gray-300">-</span>}
                        </td>

                        {/* 주차 */}
                        <td className="px-4 py-3 text-center text-gray-600">
                          {r.week != null ? `${r.week}주차` : <span className="text-gray-300">-</span>}
                        </td>

                        {/* 제출: approvedCount / writingGoal */}
                        <td className="px-4 py-3 text-center tabular-nums">
                          {r.hasLovableData ? (
                            <span className={r.approvedCount >= (r.writingGoal ?? 0) && (r.writingGoal ?? 0) > 0 ? 'text-green-600 font-semibold' : 'text-[#1a1a2e] font-medium'}>
                              {r.approvedCount}
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                          <span className="text-gray-300 mx-0.5">/</span>
                          <span className="text-gray-400">{r.writingGoal ?? '-'}</span>
                        </td>

                        {/* 제휴: affiliateContentCount / personalGoal */}
                        <td className="px-4 py-3 text-center tabular-nums">
                          {r.hasLovableData ? (
                            <span className={r.affiliateContentCount >= (r.personalGoal ?? 0) && (r.personalGoal ?? 0) > 0 ? 'text-green-600 font-semibold' : 'text-[#1a1a2e] font-medium'}>
                              {r.affiliateContentCount}
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                          <span className="text-gray-300 mx-0.5">/</span>
                          <span className="text-gray-400">{r.personalGoal ?? '-'}</span>
                        </td>

                        {/* 마지막 제출일 */}
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {formatDate(r.lastSubmittedAt)}
                        </td>

                        {/* 상세 보기 */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setDetailRow(r)}
                            disabled={!r.hasLovableData || r.submissions.length === 0}
                            className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:border-[#28B8D1] hover:text-[#28B8D1] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            {r.submissions.length > 0 ? `${r.submissions.length}건` : '없음'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t border-gray-50">
              <p className="text-xs text-gray-400">
                {filtered.length}명 표시 중
                {filtered.length !== rows.length && ` (전체 ${rows.length}명)`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {detailRow !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) setDetailRow(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-[#1a1a2e]">
                  제출 상세 — AID {detailRow.aid || '-'}
                  {detailRow.nickname && (
                    <span className="ml-2 text-sm font-normal text-gray-400">({detailRow.nickname})</span>
                  )}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  총 {detailRow.submissions.length}건 제출
                  {detailRow.week != null && ` · ${detailRow.week}주차`}
                </p>
              </div>
              <button
                onClick={() => setDetailRow(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none flex-shrink-0"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {detailRow.submissions.length === 0 ? (
                <p className="text-center text-gray-300 text-sm py-10">제출 내역이 없습니다.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/70 sticky top-0">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">콘텐츠 URL</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">제출일시</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">게시일</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">주차</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">제휴링크</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">상태</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">관리자 코멘트</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailRow.submissions.map((s, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="px-4 py-3 max-w-[220px]">
                            <a
                              href={s.contentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={s.contentUrl}
                              className="text-[#28B8D1] hover:underline block truncate text-xs"
                            >
                              {s.contentUrl}
                            </a>
                          </td>
                          <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                            {formatDateTime(s.submittedAt)}
                          </td>
                          <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                            {s.postDate || '-'}
                          </td>
                          <td className="px-3 py-3 text-center text-gray-600 text-xs">
                            {s.week}주차
                          </td>
                          <td className="px-3 py-3 text-center">
                            {s.hasAffiliateLink ? (
                              <span className="inline-flex text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">포함</span>
                            ) : (
                              <span className="inline-flex text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">없음</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${
                              s.status === 'approved'
                                ? 'bg-green-100 text-green-700'
                                : s.status === 'rejected'
                                  ? 'bg-[#FF7789]/10 text-[#FF7789]'
                                  : 'bg-gray-100 text-gray-500'
                            }`}>
                              {SUB_STATUS_LABELS[s.status] ?? s.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-gray-400 text-xs max-w-[160px] truncate" title={s.adminComment ?? ''}>
                            {s.adminComment ?? <span className="text-gray-200">-</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end flex-shrink-0">
              <button
                onClick={() => setDetailRow(null)}
                className="px-5 py-2 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:border-gray-300 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
