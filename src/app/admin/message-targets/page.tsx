'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

type Channel = 'alimtalk' | 'lms' | 'email';

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

interface SendResult {
  success: number;
  failed: number;
  skipped: number;
  total: number;
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
  email: '이메일',
};

const CHANNEL_BADGE_CLASS: Record<Channel, string> = {
  alimtalk: 'bg-[#28B8D1]/10 text-[#28B8D1] border border-[#28B8D1]/20',
  lms: 'bg-[#FF7789]/10 text-[#FF7789] border border-[#FF7789]/20',
  email: 'bg-orange-100 text-orange-700 border border-orange-200',
};

const CATEGORY_LABELS: Record<string, string> = {
  payment: '입금',
  complete: '완료',
  start: '시작',
  reminder: '리마인드',
  misc: '기타',
  boosting: '기타(구)',
  operation: '기타(구)',
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

function applyVariables(text: string, variables: VariableEntry[], person: TargetPerson): string {
  let result = text;
  for (const { key, value } of variables) {
    if (!key) continue;
    result = result.split(key).join(resolveVariable(value, person));
  }
  return result;
}

function substituteEmailVars(text: string, person: TargetPerson): string {
  const vars: Record<string, string> = {
    nickname: person.nickname ?? '',
    aid: person.aid ?? '',
    email: person.email ?? '',
    phone: person.phone ?? '',
    blog_url: '',
    class_type: person.class_type ?? '',
    writing_goal: String(person.writingGoal ?? ''),
    personal_goal: String(person.personalGoal ?? ''),
  };
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
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
  const [selectedChannel, setSelectedChannel] = useState<string>('');
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

  // ── Send state ──
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isTestSend, setIsTestSend] = useState(false);

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
  const channelTemplates = useMemo(
    () => selectedChannel ? templates.filter(t => t.channel === selectedChannel) : templates,
    [templates, selectedChannel],
  );

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
    const ch = selectedTemplate?.channel ?? '';
    const withPhone = sel.filter(t => !!t.phone).length;
    const withEmail = sel.filter(t => !!t.email).length;

    let canSend = 0;
    let cannotSend = 0;
    if (ch === 'email') {
      canSend = withEmail;
      cannotSend = sel.length - withEmail;
    } else if (ch === 'alimtalk' || ch === 'lms') {
      canSend = withPhone;
      cannotSend = sel.length - withPhone;
    } else {
      canSend = sel.length;
      cannotSend = 0;
    }

    return {
      autoExtracted: autoExtractedCount,
      selected: sel.length,
      canSend,
      cannotSend,
    };
  }, [selectedTargets, selectedTemplate, autoExtractedCount]);

  const parsedVariables = useMemo(
    () => parseVariables(selectedTemplate?.variables ?? null),
    [selectedTemplate],
  );

  const previewPerson = selectedTargets[0] ?? null;
  const confirmPreviewTargets = useMemo(() => selectedTargets.slice(0, 5), [selectedTargets]);

  function previewText(text: string | null): string {
    if (!text) return '';
    if (!previewPerson || parsedVariables.length === 0) return text;
    return applyVariables(text, parsedVariables, previewPerson);
  }

  function previewEmailText(text: string | null): string {
    if (!text) return '';
    if (!previewPerson) return text;
    return substituteEmailVars(text, previewPerson);
  }

  const canSendNow = !!selectedTemplate && selectedAids.size > 0 && !sending;

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

  const handleSearch = () => setSearch(searchInput);

  const handleChannelChange = (ch: string) => {
    setSelectedChannel(ch);
    if (selectedTemplate && ch && selectedTemplate.channel !== ch) {
      setSelectedTemplateId('');
    }
  };

  const handleTemplateChange = (id: string) => {
    setSelectedTemplateId(id);
    if (id) {
      const tmpl = templates.find(t => t.id === id);
      if (tmpl) setSelectedChannel(tmpl.channel);
    }
  };

  // ── Send ──
  const handleSend = async () => {
    if (!selectedTemplate || selectedAids.size === 0) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch('/api/admin/send-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          aids: Array.from(selectedAids),
          is_test: isTestSend,
        }),
      });
      const json = await res.json() as {
        success?: number; failed?: number; skipped?: number; total?: number; error?: string;
      };
      if (!res.ok || json.error) throw new Error(json.error ?? '발송 실패');
      setSendResult({
        success: json.success ?? 0,
        failed: json.failed ?? 0,
        skipped: json.skipped ?? 0,
        total: json.total ?? 0,
      });
      setShowConfirmModal(false);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setSending(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs text-gray-400 mb-0.5">세시간전 습관챌린지</p>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">발송 대상 확인 · 수동 발송</h1>
          <p className="text-sm text-gray-400 mt-1">
            채널과 템플릿을 선택하고, 대상자를 확인한 후 메시지를 발송합니다.
          </p>
        </div>

        {/* Send result banner */}
        {sendResult && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-bold text-green-800">발송 완료</p>
                <p className="text-xs text-green-600 mt-0.5">
                  성공 <strong>{sendResult.success}</strong>명 · 실패 <strong>{sendResult.failed}</strong>명 · 제외 <strong>{sendResult.skipped}</strong>명 (전체 {sendResult.total}명)
                </p>
              </div>
            </div>
            <button
              onClick={() => setSendResult(null)}
              className="text-green-400 hover:text-green-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Settings Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Channel select */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                채널 <span className="text-[#FF7789]">*</span>
              </label>
              <select
                value={selectedChannel}
                onChange={e => handleChannelChange(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-700"
              >
                <option value="">전체 채널</option>
                <option value="alimtalk">알림톡</option>
                <option value="lms">LMS</option>
                <option value="email">이메일</option>
              </select>
            </div>

            {/* Template select */}
            <div className="sm:col-span-1 lg:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                메시지 템플릿 <span className="text-[#FF7789]">*</span>
              </label>
              <select
                value={selectedTemplateId}
                onChange={e => handleTemplateChange(e.target.value)}
                disabled={templatesLoading}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-700 disabled:opacity-50"
              >
                <option value="">
                  {templatesLoading ? '불러오는 중...' : '템플릿 선택'}
                </option>
                {channelTemplates.map(t => (
                  <option key={t.id} value={t.id}>
                    [{CHANNEL_LABELS[t.channel] ?? t.channel}] {t.name}
                    {t.message_category ? ` · ${CATEGORY_LABELS[t.message_category] ?? t.message_category}` : ''}
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
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                검색
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="이름, 이메일, 휴대폰, AID"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
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
                label: '현재 선택',
                value: summary.selected,
                color: 'text-[#28B8D1]',
                dot: 'bg-[#28B8D1]',
                highlight: true,
              },
              {
                label: '발송 가능',
                value: summary.canSend,
                color: 'text-green-600',
                dot: 'bg-green-500',
                highlight: false,
              },
              {
                label: '발송 불가(제외)',
                value: summary.cannotSend,
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

          {/* Send button */}
          <div className="flex items-end">
            <button
              onClick={() => { setSendError(null); setShowConfirmModal(true); }}
              disabled={!canSendNow}
              className={`px-5 py-3 rounded-2xl text-sm font-semibold whitespace-nowrap transition-colors ${
                canSendNow
                  ? 'bg-[#28B8D1] text-white hover:bg-[#1fa8bf] shadow-sm cursor-pointer'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              }`}
              title={!selectedTemplate ? '채널과 템플릿을 선택해주세요' : selectedAids.size === 0 ? '대상자를 선택해주세요' : ''}
            >
              {selectedTemplate
                ? `${selectedAids.size}명에게 발송`
                : '템플릿 선택 후 발송 가능'}
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
                        '참여반', '해외', '상태', '주차', '제출', '제휴', '마지막 제출일',
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
                      const missingContact = selectedTemplate
                        ? (selectedTemplate.channel === 'email' ? !t.email : !t.phone)
                        : false;
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
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleOne(t.aid)}
                              className="w-4 h-4 rounded border-gray-300 accent-[#28B8D1] cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.aid || '-'}</td>
                          <td className="px-4 py-3 font-medium text-[#1a1a2e]">{t.nickname || '-'}</td>
                          <td className="px-4 py-3 max-w-[160px]">
                            <div className={`truncate text-xs ${missingContact && selectedTemplate?.channel === 'email' ? 'text-amber-500 font-medium' : 'text-gray-500'}`} title={t.email ?? ''}>
                              {t.email || <span className="text-amber-400 font-medium">없음</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {t.phone || (
                              <span className={missingContact && selectedTemplate?.channel !== 'email' ? 'text-amber-500 font-medium' : 'text-amber-400 font-medium'}>없음</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">{t.class_type || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            {t.is_overseas_resident ? (
                              <span className="inline-flex items-center text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                                해외
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {t.status ? (
                              <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CLASS[t.status] ?? 'bg-gray-100 text-gray-500'}`}>
                                {STATUS_LABEL[t.status] ?? t.status}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {t.week !== null ? `${t.week}주` : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs font-bold ${(t.approvedCount ?? 0) > 0 ? 'text-green-600' : 'text-gray-300'}`}>
                              {t.approvedCount ?? 0}
                            </span>
                            {t.writingGoal !== null && (
                              <span className="text-xs text-gray-300">/{t.writingGoal}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-gray-500">
                            {t.affiliateContentCount ?? 0}
                          </td>
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

            {targets.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-50">
                <p className="text-xs text-gray-400">
                  {targets.length}명 추출 · {selectedAids.size}명 선택
                  {selectedTemplate && summary.cannotSend > 0 && (
                    <span className="text-amber-500 ml-2">· 발송 불가(연락처 없음) {summary.cannotSend}명</span>
                  )}
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
                  <svg className="w-10 h-10 text-gray-100 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p className="text-xs text-gray-300">채널과 템플릿을 선택하면 미리보기가 표시됩니다.</p>
                </div>
              ) : (
                <>
                  {/* Channel + name */}
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${CHANNEL_BADGE_CLASS[selectedTemplate.channel]}`}>
                      {CHANNEL_LABELS[selectedTemplate.channel]}
                    </span>
                    <span className="text-xs text-gray-500 leading-6 break-words">{selectedTemplate.name}</span>
                  </div>

                  {/* ── Alimtalk ── */}
                  {selectedTemplate.channel === 'alimtalk' && (
                    <>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">SOLAPI 템플릿 코드</p>
                        <p className="font-mono text-xs text-gray-700 bg-gray-50 rounded-xl px-3 py-2 break-all">
                          {selectedTemplate.solapi_template_code || <span className="text-gray-300">없음</span>}
                        </p>
                      </div>
                      {parsedVariables.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-2">변수 매핑</p>
                          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                            {parsedVariables.map((v, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs min-w-0">
                                <span className="font-mono text-gray-600 bg-white border border-gray-200 rounded px-2 py-1 flex-shrink-0 max-w-[40%] truncate">{v.key}</span>
                                <span className="text-gray-300 flex-shrink-0">→</span>
                                <span className="text-[#28B8D1] font-semibold truncate">
                                  {previewPerson ? resolveVariable(v.value, previewPerson) : v.value || '-'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
                      {selectedTemplate.title && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1.5">제목</p>
                          <p className="text-sm font-semibold text-[#1a1a2e] bg-gray-50 rounded-xl px-3 py-2">
                            {previewText(selectedTemplate.title)}
                          </p>
                        </div>
                      )}
                      {parsedVariables.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-2">변수 치환</p>
                          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                            {parsedVariables.map((v, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs min-w-0">
                                <span className="font-mono text-gray-600 bg-white border border-gray-200 rounded px-2 py-1 flex-shrink-0 max-w-[40%] truncate">{v.key}</span>
                                <span className="text-gray-300 flex-shrink-0">→</span>
                                <span className="text-[#FF7789] font-semibold truncate">
                                  {previewPerson ? resolveVariable(v.value, previewPerson) : v.value || '-'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">본문</p>
                        <div className="text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-3 whitespace-pre-wrap leading-relaxed min-h-[80px]">
                          {previewText(selectedTemplate.body) || <span className="text-gray-300">본문 없음</span>}
                        </div>
                      </div>
                      <div className="bg-[#FF7789]/5 border border-[#FF7789]/10 rounded-xl px-3 py-2.5">
                        <p className="text-xs text-[#FF7789] leading-relaxed">LMS는 위 본문이 실제 발송 문구로 사용됩니다.</p>
                      </div>
                    </>
                  )}

                  {/* ── 이메일 ── */}
                  {selectedTemplate.channel === 'email' && (
                    <>
                      {selectedTemplate.title && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1.5">이메일 제목</p>
                          <p className="text-sm font-semibold text-[#1a1a2e] bg-orange-50 rounded-xl px-3 py-2">
                            {previewEmailText(selectedTemplate.title)}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">이메일 본문</p>
                        <div className="text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-3 whitespace-pre-wrap leading-relaxed min-h-[80px]">
                          {previewEmailText(selectedTemplate.body) || <span className="text-gray-300">본문 없음</span>}
                        </div>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5">
                        <p className="text-xs text-orange-700 leading-relaxed">
                          Gmail SMTP로 발송됩니다. {'{{'+'nickname'+'}}'}, {'{{'+'aid'+'}}'} 등 변수가 자동 치환됩니다.
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

      {/* ── Confirm Modal ── */}
      {showConfirmModal && selectedTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={e => { if (e.target === e.currentTarget && !sending) setShowConfirmModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-[#1a1a2e]">발송 확인</h2>
              {!sending && (
                <button
                  onClick={() => { setShowConfirmModal(false); setSendError(null); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Channel + Template */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1.5">채널</p>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CHANNEL_BADGE_CLASS[selectedTemplate.channel]}`}>
                    {CHANNEL_LABELS[selectedTemplate.channel]}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">템플릿</p>
                  <p className="text-sm font-semibold text-[#1a1a2e] leading-tight">{selectedTemplate.name}</p>
                </div>
              </div>

              {/* Count */}
              <div className="bg-[#28B8D1]/5 border border-[#28B8D1]/20 rounded-xl px-4 py-3">
                <p className="text-sm font-bold text-[#1a1a2e]">
                  정말 <span className="text-[#28B8D1]">{summary.selected}명</span>에게 발송하시겠습니까?
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-xs">
                  <span className="text-green-600 font-medium">발송 가능 {summary.canSend}명</span>
                  {summary.cannotSend > 0 && (
                    <span className="text-amber-500">제외(연락처 없음) {summary.cannotSend}명</span>
                  )}
                </div>
              </div>

              {/* Preview list */}
              <div>
                <p className="text-xs text-gray-400 mb-2">발송 대상 미리보기 (앞 5명)</p>
                <div className="space-y-1.5">
                  {confirmPreviewTargets.map(t => (
                    <div key={t.aid} className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-3 py-1.5">
                      <span className="font-mono text-gray-400 w-14 flex-shrink-0 truncate">{t.aid || '-'}</span>
                      <span className="font-medium text-[#1a1a2e] w-16 flex-shrink-0 truncate">{t.nickname || '-'}</span>
                      <span className="text-gray-400 truncate min-w-0">
                        {selectedTemplate.channel === 'email'
                          ? (t.email || '이메일 없음')
                          : (t.phone || '번호 없음')}
                      </span>
                    </div>
                  ))}
                  {selectedTargets.length > 5 && (
                    <p className="text-xs text-gray-400 pl-1">... 외 {selectedTargets.length - 5}명</p>
                  )}
                </div>
              </div>

              {sendError && (
                <p className="text-xs text-[#FF7789] bg-[#FF7789]/5 rounded-xl px-3 py-2">{sendError}</p>
              )}

              {/* 테스트 발송 체크박스 */}
              <label className="flex items-start gap-3 cursor-pointer bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={isTestSend}
                  onChange={e => setIsTestSend(e.target.checked)}
                  disabled={sending}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-amber-500 cursor-pointer flex-shrink-0"
                />
                <span className="text-xs text-amber-700">
                  <span className="font-bold">테스트 발송으로 기록</span>
                  <span className="block text-amber-600 mt-0.5">체크 시 발송 로그에 "테스트" 배지가 표시되며, 해당 로그를 삭제할 수 있습니다.</span>
                </span>
              </label>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => { if (!sending) { setShowConfirmModal(false); setSendError(null); setIsTestSend(false); } }}
                disabled={sending}
                className="flex-1 border border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm font-medium hover:border-gray-300 disabled:opacity-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 transition-colors flex items-center justify-center gap-2 ${
                  isTestSend
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-[#28B8D1] text-white hover:bg-[#1fa8bf]'
                }`}
              >
                {sending && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
                )}
                {sending ? '발송 중...' : isTestSend ? `테스트로 ${summary.selected}명에게 발송` : `${summary.selected}명에게 발송`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
