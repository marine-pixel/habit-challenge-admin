'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

type Channel = 'alimtalk' | 'lms';

interface VariableEntry {
  key: string;
  value: string;
}

interface MessageTemplate {
  id: string;
  name: string;
  channel: Channel;
  message_category: string;
  solapi_template_code: string | null;
  solapi_pf_id: string | null;
  title: string | null;
  body: string | null;
  variables: Array<VariableEntry | string> | null;
  is_active: boolean;
}

interface TargetPerson {
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

type TargetType =
  | 'payment_request'
  | 'payment_completed'
  | 'challenge_start'
  | 'payment_reminder'
  | 'weekly_start'
  | 'weekly_incomplete'
  | 'manual_selected'
  | '';

// ── Constants ──────────────────────────────────────────────────────────────

const TARGET_TYPE_OPTIONS: { value: TargetType; label: string; desc: string }[] = [
  { value: '', label: '대상 유형 선택', desc: '' },
  { value: 'payment_request', label: '입금 요청 대상', desc: '신청완료(applied) 상태' },
  { value: 'payment_completed', label: '입금완료 안내 대상', desc: '입금완료(paid) 상태' },
  { value: 'challenge_start', label: '시작 안내 대상', desc: '입금완료(paid) 전체' },
  { value: 'payment_reminder', label: '미입금 재요청 대상', desc: '신청완료(applied) 상태' },
  { value: 'weekly_start', label: '이번 주 시작 안내 대상', desc: '입금완료(paid) 전체' },
  { value: 'weekly_incomplete', label: '목표 미달성 리마인드 대상', desc: '선택 월/주차 기준 미달성자' },
  { value: 'manual_selected', label: '직접 선택', desc: '전체 신청자 수동 선택' },
];

const STATUS_LABEL: Record<string, string> = {
  applied: '신청완료',
  paid: '입금완료',
  cancelled: '취소',
};

const STATUS_CLASS: Record<string, string> = {
  applied: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-400',
};

const CHANNEL_LABELS: Record<Channel, string> = {
  alimtalk: '알림톡',
  lms: 'LMS',
};

const CHANNEL_BADGE_CLASS: Record<Channel, string> = {
  alimtalk: 'bg-[#28B8D1]/10 text-[#28B8D1] border border-[#28B8D1]/20',
  lms: 'bg-[#FF7789]/10 text-[#FF7789] border border-[#FF7789]/20',
};

const CATEGORY_LABELS: Record<string, string> = {
  payment: '입금 메세지',
  boosting: '부스팅 메세지',
  start: '시작 메세지',
  reminder: '리마인드 메세지',
  operation: '운영 안내',
};

const MONTH_OPTIONS = ['2026-05', '2026-06', '2026-07'];
const WEEK_OPTIONS = [1, 2, 3, 4, 5, 6];

const PERSON_FIELD_KEYS: ReadonlySet<string> = new Set([
  'nickname', 'aid', 'email', 'phone', 'class_type', 'status',
  'week', 'approvedCount', 'writingGoal', 'affiliateContentCount',
  'personalGoal', 'lastSubmittedAt',
]);

// ── Helpers ────────────────────────────────────────────────────────────────

function parseVariables(vars: Array<VariableEntry | string> | null): VariableEntry[] {
  if (!vars || vars.length === 0) return [];
  return vars.map(v => (typeof v === 'string' ? { key: v, value: v } : v));
}

function resolveVariable(value: string, person: TargetPerson): string {
  if (PERSON_FIELD_KEYS.has(value)) {
    const raw = person[value as keyof TargetPerson];
    if (raw === null || raw === undefined || raw === '') return '-';
    return String(raw);
  }
  return value !== '' ? value : '-';
}

function applyVariables(
  text: string,
  variables: VariableEntry[],
  person: TargetPerson,
): string {
  let result = text;
  for (const { key, value } of variables) {
    if (!key) continue;
    result = result.split(key).join(resolveVariable(value, person));
  }
  return result;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Component ──────────────────────────────────────────────────────────────

export default function MessageTargetsPage() {
  // ── Templates ──
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  // ── Filter state ──
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [targetType, setTargetType] = useState<TargetType>('');
  const [month, setMonth] = useState('2026-05');
  const [week, setWeek] = useState('');
  const [classType, setClassType] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // ── Targets ──
  const [targets, setTargets] = useState<TargetPerson[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [targetsError, setTargetsError] = useState<string | null>(null);
  const [autoExtractedCount, setAutoExtractedCount] = useState(0);

  // ── Selection ──
  const [selectedAids, setSelectedAids] = useState<Set<string>>(new Set());

  // ── Load active templates ──
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setTemplatesLoading(true);
      try {
        const res = await fetch('/api/admin/message-templates');
        if (!res.ok) return;
        const json = (await res.json()) as { data: MessageTemplate[] };
        if (!cancelled) setTemplates((json.data ?? []).filter(t => t.is_active));
      } catch {
        // non-critical
      } finally {
        if (!cancelled) setTemplatesLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  // ── Load targets ──
  const fetchTargets = useCallback(async () => {
    if (!targetType) {
      setTargets([]);
      setSelectedAids(new Set());
      setAutoExtractedCount(0);
      return;
    }
    setTargetsLoading(true);
    setTargetsError(null);
    try {
      const params = new URLSearchParams({ targetType, month });
      if (week) params.set('week', week);
      if (classType) params.set('classType', classType);
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/message-targets?${params.toString()}`);
      const json = (await res.json()) as {
        data?: TargetPerson[];
        error?: string;
        noChallenge?: boolean;
      };
      if (json.error) throw new Error(json.error);
      if (json.noChallenge) {
        setTargets([]);
        setAutoExtractedCount(0);
        setTargetsError('선택한 월에 해당하는 챌린지 정보가 없습니다.');
        return;
      }
      const data = json.data ?? [];
      setTargets(data);
      setAutoExtractedCount(data.length);
      setSelectedAids(new Set(data.map(t => t.aid)));
    } catch (e) {
      setTargetsError(e instanceof Error ? e.message : '대상자 조회 중 오류가 발생했습니다.');
      setTargets([]);
    } finally {
      setTargetsLoading(false);
    }
  }, [targetType, month, week, classType, search]);

  useEffect(() => {
    void fetchTargets();
  }, [fetchTargets]);

  // ── Derived ──
  const selectedTemplate = useMemo(
    () => templates.find(t => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  const selectedTargets = useMemo(
    () => targets.filter(t => selectedAids.has(t.aid)),
    [targets, selectedAids],
  );

  const summary = useMemo(() => {
    const sel = selectedTargets;
    const withPhone = sel.filter(t => !!t.phone).length;
    const noPhone = sel.filter(t => !t.phone).length;
    const alimtalk = selectedTemplate?.channel === 'alimtalk' ? withPhone : 0;
    const lms = selectedTemplate?.channel === 'lms' ? withPhone : 0;
    return {
      autoExtracted: autoExtractedCount,
      selected: sel.length,
      alimtalk,
      lms,
      noPhone,
    };
  }, [selectedTargets, selectedTemplate, autoExtractedCount]);

  const parsedVariables = useMemo(
    () => parseVariables(selectedTemplate?.variables ?? null),
    [selectedTemplate],
  );

  const previewPerson = selectedTargets[0] ?? null;

  function previewText(text: string | null): string {
    if (!text) return '';
    if (!previewPerson || parsedVariables.length === 0) return text;
    return applyVariables(text, parsedVariables, previewPerson);
  }

  // ── Checkbox ──
  const isAllSelected = targets.length > 0 && selectedAids.size === targets.length;
  const isIndeterminate = selectedAids.size > 0 && selectedAids.size < targets.length;

  const toggleAll = useCallback(() => {
    setSelectedAids(prev =>
      prev.size === targets.length ? new Set() : new Set(targets.map(t => t.aid)),
    );
  }, [targets]);

  const toggleOne = useCallback((aid: string) => {
    setSelectedAids(prev => {
      const next = new Set(prev);
      if (next.has(aid)) next.delete(aid);
      else next.add(aid);
      return next;
    });
  }, []);

  const handleSearch = () => {
    setSearch(searchInput);
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs text-gray-400 mb-0.5">세시간전 습관챌린지</p>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">발송 대상 확인</h1>
          <p className="text-sm text-gray-400 mt-1">
            메시지 템플릿과 발송 대상 유형을 선택해 실제 발송 전 대상자와 내용을 확인합니다.
          </p>
        </div>

        {/* Settings Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Template select */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                메시지 템플릿
              </label>
              <select
                value={selectedTemplateId}
                onChange={e => setSelectedTemplateId(e.target.value)}
                disabled={templatesLoading}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-700 disabled:opacity-50"
              >
                <option value="">
                  {templatesLoading ? '불러오는 중...' : '템플릿 선택 (선택)'}
                </option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    [{CHANNEL_LABELS[t.channel]}] {t.name} · {CATEGORY_LABELS[t.message_category] ?? t.message_category}
                  </option>
                ))}
              </select>
            </div>

            {/* Target type */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                발송 대상 유형 <span className="text-[#FF7789]">*</span>
              </label>
              <select
                value={targetType}
                onChange={e => setTargetType(e.target.value as TargetType)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-700"
              >
                {TARGET_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                    {opt.desc ? ` — ${opt.desc}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Month */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                월 선택
              </label>
              <select
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-700"
              >
                {MONTH_OPTIONS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Week */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                주차 선택
                {targetType === 'weekly_incomplete' && (
                  <span className="text-[#FF7789] ml-1 font-normal">미달성 조회 시 사용</span>
                )}
              </label>
              <select
                value={week}
                onChange={e => setWeek(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-700"
              >
                <option value="">전체</option>
                {WEEK_OPTIONS.map(w => (
                  <option key={w} value={String(w)}>{w}주차</option>
                ))}
              </select>
            </div>

            {/* Class type */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                참여반 필터
              </label>
              <select
                value={classType}
                onChange={e => setClassType(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-700"
              >
                <option value="">전체 반</option>
                <option value="베이직반">베이직반</option>
                <option value="부스터반">부스터반</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                검색
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="이름, 이메일, 휴대폰, AID"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] transition-colors"
                />
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 rounded-xl bg-[#28B8D1] text-white text-sm font-medium hover:bg-[#1fa8bf] transition-colors flex-shrink-0"
                >
                  검색
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Summary + Send button row */}
        <div className="flex flex-wrap items-stretch gap-3 mb-4">
          {(
            [
              {
                label: '자동 추출 대상',
                value: summary.autoExtracted,
                color: 'text-[#1a1a2e]',
                dot: 'bg-gray-300',
                highlight: false,
              },
              {
                label: '현재 선택된 대상',
                value: summary.selected,
                color: 'text-[#28B8D1]',
                dot: 'bg-[#28B8D1]',
                highlight: true,
              },
              {
                label: '알림톡 대상',
                value: summary.alimtalk,
                color: 'text-[#28B8D1]',
                dot: 'bg-[#28B8D1]/40',
                highlight: false,
              },
              {
                label: 'LMS 대상',
                value: summary.lms,
                color: 'text-[#FF7789]',
                dot: 'bg-[#FF7789]/40',
                highlight: false,
              },
              {
                label: '번호 없는 대상',
                value: summary.noPhone,
                color: 'text-amber-500',
                dot: 'bg-amber-400',
                highlight: false,
              },
            ] as const
          ).map(({ label, value, color, dot, highlight }) => (
            <div
              key={label}
              className={`flex-1 min-w-[130px] bg-white rounded-2xl shadow-sm px-4 py-3 flex flex-col gap-0.5 border ${
                highlight
                  ? 'border-[#28B8D1]/30 ring-1 ring-[#28B8D1]/20'
                  : 'border-gray-100'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                <p className="text-xs text-gray-400 font-medium whitespace-nowrap">{label}</p>
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}

          {/* Disabled send button */}
          <div className="flex items-end">
            <button
              disabled
              title="SOLAPI 연동 후 사용 가능합니다"
              className="px-5 py-3 rounded-2xl bg-gray-100 text-gray-400 text-sm font-semibold cursor-not-allowed border border-gray-200 whitespace-nowrap select-none"
            >
              SOLAPI 연동 후 발송 가능
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-col xl:flex-row gap-4 items-start">

          {/* ── Target List ── */}
          <div className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Table toolbar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-bold text-[#1a1a2e]">대상자 목록</span>
                {!targetsLoading && targets.length > 0 && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {targets.length}명 추출
                  </span>
                )}
              </div>

              {targets.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs">
                    <span className="font-bold text-[#28B8D1] text-sm">{selectedAids.size}</span>
                    <span className="text-gray-400">명 선택됨</span>
                  </span>
                  <button
                    onClick={toggleAll}
                    className="text-xs text-[#28B8D1] hover:underline font-medium"
                  >
                    {isAllSelected ? '전체 해제' : '전체 선택'}
                  </button>
                </div>
              )}
            </div>

            {/* Error */}
            {targetsError && (
              <div className="px-5 py-5 flex items-center gap-3">
                <span className="text-sm text-[#FF7789]">{targetsError}</span>
                <button
                  onClick={() => void fetchTargets()}
                  className="text-xs text-[#28B8D1] underline"
                >
                  다시 시도
                </button>
              </div>
            )}

            {/* Loading */}
            {targetsLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="w-7 h-7 border-2 border-[#28B8D1] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Empty */}
            {!targetsLoading && !targetsError && targets.length === 0 && (
              <div className="text-center py-20">
                {targetType ? (
                  <p className="text-gray-300 text-sm">조건에 맞는 대상자가 없습니다.</p>
                ) : (
                  <div>
                    <p className="text-gray-300 text-sm mb-1">발송 대상 유형을 선택해주세요.</p>
                    <p className="text-gray-200 text-xs">대상 유형을 선택하면 조건에 맞는 대상자가 자동 추출됩니다.</p>
                  </div>
                )}
              </div>
            )}

            {/* Table */}
            {!targetsLoading && targets.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70">
                      <th className="px-4 py-3 w-10 flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          ref={(el: HTMLInputElement | null) => {
                            if (el) el.indeterminate = isIndeterminate;
                          }}
                          onChange={toggleAll}
                          className="w-4 h-4 rounded border-gray-300 accent-[#28B8D1] cursor-pointer"
                        />
                      </th>
                      {[
                        'AID', '이름', '이메일', '휴대폰',
                        '참여반', '이메일추가', '상태', '주차', '제출', '제휴', '마지막 제출일',
                      ].map(col => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {targets.map(t => {
                      const isSelected = selectedAids.has(t.aid);
                      return (
                        <tr
                          key={t.aid || t.applicantId}
                          onClick={() => toggleOne(t.aid)}
                          className={`border-b border-gray-50 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#28B8D1]/5 hover:bg-[#28B8D1]/10'
                              : 'hover:bg-gray-50/70'
                          }`}
                        >
                          {/* Checkbox */}
                          <td
                            className="px-4 py-3"
                            onClick={e => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleOne(t.aid)}
                              className="w-4 h-4 rounded border-gray-300 accent-[#28B8D1] cursor-pointer"
                            />
                          </td>

                          {/* AID */}
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">
                            {t.aid || '-'}
                          </td>

                          {/* 이름 */}
                          <td className="px-4 py-3 font-medium text-[#1a1a2e]">
                            {t.nickname || '-'}
                          </td>

                          {/* 이메일 */}
                          <td className="px-4 py-3 max-w-[160px]">
                            <div
                              className="truncate text-xs text-gray-500"
                              title={t.email ?? ''}
                            >
                              {t.email || '-'}
                            </div>
                          </td>

                          {/* 휴대폰 */}
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {t.phone || (
                              <span className="text-amber-400 font-medium">없음</span>
                            )}
                          </td>

                          {/* 참여반 */}
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {t.class_type || '-'}
                          </td>

                          {/* 이메일 추가 발송 여부 */}
                          <td className="px-4 py-3 text-center">
                            {t.is_overseas_resident ? (
                              <span className="inline-flex items-center text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                                이메일 추가
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">-</span>
                            )}
                          </td>

                          {/* 상태 */}
                          <td className="px-4 py-3">
                            {t.status ? (
                              <span
                                className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                                  STATUS_CLASS[t.status] ?? 'bg-gray-100 text-gray-500'
                                }`}
                              >
                                {STATUS_LABEL[t.status] ?? t.status}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>

                          {/* 주차 */}
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {t.week !== null ? `${t.week}주` : '-'}
                          </td>

                          {/* 제출 */}
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`text-xs font-bold ${
                                (t.approvedCount ?? 0) > 0 ? 'text-green-600' : 'text-gray-300'
                              }`}
                            >
                              {t.approvedCount ?? 0}
                            </span>
                            {t.writingGoal !== null && (
                              <span className="text-xs text-gray-300">
                                /{t.writingGoal}
                              </span>
                            )}
                          </td>

                          {/* 제휴 */}
                          <td className="px-4 py-3 text-center text-xs text-gray-500">
                            {t.affiliateContentCount ?? 0}
                          </td>

                          {/* 마지막 제출일 */}
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {formatDate(t.lastSubmittedAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            {targets.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-50">
                <p className="text-xs text-gray-400">
                  {targets.length}명 추출 · {selectedAids.size}명 선택
                </p>
              </div>
            )}
          </div>

          {/* ── Message Preview ── */}
          <div className="w-full xl:w-[360px] flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-[#1a1a2e]">메시지 미리보기</h3>
              {previewPerson ? (
                <p className="text-xs text-gray-400 mt-0.5">
                  기준 대상: {previewPerson.nickname || previewPerson.aid || '-'}
                </p>
              ) : (
                <p className="text-xs text-gray-300 mt-0.5">대상자를 선택하면 미리보기가 표시됩니다.</p>
              )}
            </div>

            <div className="p-5 space-y-4">
              {!selectedTemplate ? (
                <div className="text-center py-10">
                  <svg
                    className="w-10 h-10 text-gray-100 mx-auto mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                  <p className="text-xs text-gray-300">템플릿을 선택하면 미리보기가 표시됩니다.</p>
                </div>
              ) : (
                <>
                  {/* Channel + name */}
                  <div className="flex items-start gap-2 flex-wrap">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                        CHANNEL_BADGE_CLASS[selectedTemplate.channel]
                      }`}
                    >
                      {CHANNEL_LABELS[selectedTemplate.channel]}
                    </span>
                    <span className="text-xs text-gray-500 leading-6 break-words">
                      {selectedTemplate.name}
                    </span>
                  </div>

                  {/* ── Alimtalk ── */}
                  {selectedTemplate.channel === 'alimtalk' && (
                    <>
                      {/* SOLAPI 코드 */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">SOLAPI 템플릿 코드</p>
                        <p className="font-mono text-xs text-gray-700 bg-gray-50 rounded-xl px-3 py-2 break-all">
                          {selectedTemplate.solapi_template_code || (
                            <span className="text-gray-300">없음</span>
                          )}
                        </p>
                      </div>

                      {/* 변수 매핑 */}
                      {parsedVariables.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-2">변수 매핑</p>
                          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                            {parsedVariables.map((v, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs min-w-0">
                                <span className="font-mono text-gray-600 bg-white border border-gray-200 rounded px-2 py-1 flex-shrink-0 max-w-[40%] truncate">
                                  {v.key}
                                </span>
                                <span className="text-gray-300 flex-shrink-0">→</span>
                                <span className="text-[#28B8D1] font-semibold truncate">
                                  {previewPerson
                                    ? resolveVariable(v.value, previewPerson)
                                    : v.value || '-'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 관리용 본문 */}
                      {selectedTemplate.body && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1.5">관리용 본문</p>
                          <div className="text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-3 whitespace-pre-wrap leading-relaxed">
                            {previewText(selectedTemplate.body)}
                          </div>
                        </div>
                      )}

                      <div className="bg-[#28B8D1]/5 border border-[#28B8D1]/10 rounded-xl px-3 py-2.5">
                        <p className="text-xs text-[#28B8D1] leading-relaxed">
                          실제 알림톡 본문은 SOLAPI 검수 템플릿 기준으로 발송됩니다.
                        </p>
                      </div>
                    </>
                  )}

                  {/* ── LMS ── */}
                  {selectedTemplate.channel === 'lms' && (
                    <>
                      {/* 제목 */}
                      {selectedTemplate.title && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1.5">제목</p>
                          <p className="text-sm font-semibold text-[#1a1a2e] bg-gray-50 rounded-xl px-3 py-2">
                            {previewText(selectedTemplate.title)}
                          </p>
                        </div>
                      )}

                      {/* 변수 매핑 */}
                      {parsedVariables.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-2">변수 치환</p>
                          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                            {parsedVariables.map((v, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs min-w-0">
                                <span className="font-mono text-gray-600 bg-white border border-gray-200 rounded px-2 py-1 flex-shrink-0 max-w-[40%] truncate">
                                  {v.key}
                                </span>
                                <span className="text-gray-300 flex-shrink-0">→</span>
                                <span className="text-[#FF7789] font-semibold truncate">
                                  {previewPerson
                                    ? resolveVariable(v.value, previewPerson)
                                    : v.value || '-'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 본문 */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">본문</p>
                        <div className="text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-3 whitespace-pre-wrap leading-relaxed min-h-[80px]">
                          {previewText(selectedTemplate.body) || (
                            <span className="text-gray-300">본문 없음</span>
                          )}
                        </div>
                      </div>

                      <div className="bg-[#FF7789]/5 border border-[#FF7789]/10 rounded-xl px-3 py-2.5">
                        <p className="text-xs text-[#FF7789] leading-relaxed">
                          LMS는 위 본문이 실제 발송 문구로 사용됩니다.
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
