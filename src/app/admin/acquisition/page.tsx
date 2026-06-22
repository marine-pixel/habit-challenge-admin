'use client';

import { useState, useEffect, useCallback } from 'react';

const SOURCE_LABELS: Record<string, string> = {
  email: '이메일',
  kakao_openchat: '단톡방',
  lms: 'LMS',
  instagram: '인스타그램',
  etc: '기타',
};

const SOURCE_OPTIONS = [
  { value: 'email', label: '이메일' },
  { value: 'kakao_openchat', label: '단톡방' },
  { value: 'lms', label: 'LMS' },
  { value: 'instagram', label: '인스타그램' },
  { value: 'etc', label: '기타' },
];

const MEDIUM_DEFAULTS: Record<string, string> = {
  email: 'stibee',
  kakao_openchat: 'community',
  lms: 'sms',
  instagram: 'social',
  etc: 'etc',
};

const CONTENT_SUGGESTIONS: Record<string, string[]> = {
  email: ['email_01_open', 'email_02_remind', 'email_03_deadline'],
  kakao_openchat: ['openchat_01_open', 'openchat_02_remind'],
  lms: ['lms_01_open', 'lms_deadline_remind'],
  instagram: ['instagram_01_post', 'instagram_02_story'],
  etc: ['etc_01'],
};

interface UtmLink {
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
}

interface StatsBreakdown {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  count: number;
  label: string | null;
  percentage: number;
}

interface AcquisitionStats {
  grand_total: number;
  total: number;
  with_utm: number;
  without_utm: number;
  breakdown: StatsBreakdown[];
}

interface UtmForm {
  challenge_month: string;
  label: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  memo: string;
}

const EMPTY_FORM: UtmForm = {
  challenge_month: '',
  label: '',
  source: '',
  medium: '',
  campaign: '',
  content: '',
  memo: '',
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

function buildDisplayLabel(row: StatsBreakdown): string {
  if (row.label) return row.label;
  if (!row.utm_source && !row.utm_content) return '출처 없음';
  const parts = [
    row.utm_source ? (SOURCE_LABELS[row.utm_source] ?? row.utm_source) : null,
    row.utm_content ?? null,
  ].filter(Boolean);
  return parts.join(' / ');
}

export default function AcquisitionPage() {
  const [monthFilter, setMonthFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [stats, setStats] = useState<AcquisitionStats | null>(null);
  const [utmLinks, setUtmLinks] = useState<UtmLink[]>([]);
  const [challengeMonths, setChallengeMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [form, setForm] = useState<UtmForm>(EMPTY_FORM);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (monthFilter !== 'all') params.set('challenge_month', monthFilter);
      if (sourceFilter !== 'all') params.set('utm_source', sourceFilter);
      const res = await fetch(`/api/admin/acquisition?${params}`);
      const data = await res.json() as {
        stats: AcquisitionStats;
        utm_links: UtmLink[];
        challenge_months: string[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? '데이터를 불러오지 못했습니다.');
      setStats(data.stats);
      setUtmLinks(data.utm_links);
      setChallengeMonths(prev => prev.length > 0 ? prev : data.challenge_months);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, [monthFilter, sourceFilter]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // 생성 URL 미리보기
  useEffect(() => {
    if (!form.source) { setGeneratedUrl(''); return; }
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const params = new URLSearchParams();
    params.set('utm_source', form.source);
    if (form.medium) params.set('utm_medium', form.medium);
    if (form.campaign) params.set('utm_campaign', form.campaign);
    if (form.content) params.set('utm_content', form.content);
    setGeneratedUrl(`${origin}/?${params.toString()}`);
  }, [form.source, form.medium, form.campaign, form.content]);

  const handleSourceChange = (source: string) => {
    setForm(prev => ({
      ...prev,
      source,
      medium: MEDIUM_DEFAULTS[source] ?? '',
      content: '',
    }));
  };

  const handleMonthChange = (month: string) => {
    const campaign = month ? month.replace('-', '_') + '_habit' : '';
    setForm(prev => ({ ...prev, challenge_month: month, campaign }));
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'source') { handleSourceChange(value); return; }
    if (name === 'challenge_month') { handleMonthChange(value); return; }
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!form.source) { setFormError('채널을 선택해주세요.'); return; }
    if (!generatedUrl) { setFormError('링크를 생성할 수 없습니다.'); return; }
    setFormLoading(true);
    setFormError('');
    try {
      const res = await fetch('/api/admin/utm-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, url: generatedUrl }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? '저장 실패');
      setForm(EMPTY_FORM);
      await fetchStats();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setFormLoading(false);
    }
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    }).catch(() => {});
  };

  const inputClass = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] transition-colors bg-white';

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── 헤더 ── */}
        <div>
          <p className="text-xs text-gray-400 mb-0.5">세시간전 습관챌린지</p>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">신청 유입</h1>
        </div>

        {/* ════════════════════════════════════════════════
            SECTION 1: 신청 유입 통계
        ════════════════════════════════════════════════ */}
        <section>
          <h2 className="text-base font-bold text-[#1a1a2e] mb-4">신청 유입 통계</h2>

          {/* 필터 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
            <div className="flex flex-wrap gap-3">
              <select
                value={monthFilter}
                onChange={e => setMonthFilter(e.target.value)}
                className="border border-[#28B8D1]/40 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-[#28B8D1]/5 text-[#28B8D1] font-medium"
              >
                <option value="all">전체 월</option>
                {challengeMonths.map(m => (
                  <option key={m} value={m}>{formatChallengeMonth(m)}</option>
                ))}
              </select>
              <select
                value={sourceFilter}
                onChange={e => setSourceFilter(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-600"
              >
                <option value="all">전체 채널</option>
                {SOURCE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
                <option value="none">출처 없음</option>
              </select>
              <button
                onClick={fetchStats}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-400 text-sm hover:border-gray-300 hover:text-gray-500 transition-colors"
                title="새로고침"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* 에러 */}
          {fetchError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600 mb-4">
              {fetchError}
            </div>
          )}

          {/* 통계 카드 */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: '전체 신청자 수', value: stats.grand_total, color: 'text-[#1a1a2e]', dot: 'bg-gray-300', sub: '전체 기간' },
                { label: 'UTM 있는 신청자', value: stats.with_utm, color: 'text-[#28B8D1]', dot: 'bg-[#28B8D1]', sub: '현재 필터 기준' },
                { label: '출처 없음', value: stats.without_utm, color: 'text-gray-400', dot: 'bg-gray-300', sub: '현재 필터 기준' },
                { label: '선택 월 기준', value: stats.total, color: 'text-purple-600', dot: 'bg-purple-400', sub: monthFilter === 'all' ? '전체 월' : formatChallengeMonth(monthFilter) },
              ].map(({ label, value, color, dot, sub }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${dot}`} />
                    <p className="text-xs text-gray-400 font-medium">{label}</p>
                  </div>
                  <p className={`text-3xl font-bold ${color}`}>{value}</p>
                  <p className="text-[11px] text-gray-300">{sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* 통계 표 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-16 flex items-center justify-center">
                <div className="w-7 h-7 border-2 border-[#28B8D1] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !stats || stats.breakdown.length === 0 ? (
              <div className="py-16 text-center text-gray-300 text-sm">데이터가 없습니다.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">유입 링크 / 메시지명</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">채널</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">utm_source</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">utm_medium</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">utm_campaign</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">utm_content</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">신청자 수</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">비율</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.breakdown.map((row, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors">
                        <td className="px-4 py-3 font-medium text-[#1a1a2e]">
                          {buildDisplayLabel(row)}
                        </td>
                        <td className="px-4 py-3">
                          {row.utm_source ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#28B8D1]/10 text-[#28B8D1]">
                              {SOURCE_LABELS[row.utm_source] ?? row.utm_source}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{row.utm_source ?? <span className="text-gray-300">-</span>}</td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{row.utm_medium ?? <span className="text-gray-300">-</span>}</td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{row.utm_campaign ?? <span className="text-gray-300">-</span>}</td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{row.utm_content ?? <span className="text-gray-300">-</span>}</td>
                        <td className="px-4 py-3 text-right font-bold text-[#1a1a2e]">{row.count}명</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-[#28B8D1] rounded-full"
                                style={{ width: `${Math.min(row.percentage, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-[#28B8D1] w-12 text-right">{row.percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {stats && (
              <div className="px-5 py-3 border-t border-gray-50 text-xs text-gray-400">
                {stats.breakdown.length}개 유입 경로 · 현재 필터 기준 {stats.total}명
              </div>
            )}
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            SECTION 2: UTM 링크 만들기
        ════════════════════════════════════════════════ */}
        <section>
          <h2 className="text-base font-bold text-[#1a1a2e] mb-4">UTM 링크 만들기</h2>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* 챌린지 월 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">챌린지 월</label>
                <select
                  name="challenge_month"
                  value={form.challenge_month}
                  onChange={handleFormChange}
                  className={inputClass}
                >
                  <option value="">선택 안 함</option>
                  {challengeMonths.map(m => (
                    <option key={m} value={m}>{formatChallengeMonth(m)}</option>
                  ))}
                </select>
              </div>

              {/* 채널 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">채널 (utm_source) <span className="text-[#FF7789]">*</span></label>
                <select
                  name="source"
                  value={form.source}
                  onChange={handleFormChange}
                  className={inputClass}
                >
                  <option value="">채널 선택</option>
                  {SOURCE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label} ({o.value})</option>
                  ))}
                </select>
              </div>

              {/* medium */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">utm_medium</label>
                <input
                  name="medium"
                  type="text"
                  value={form.medium}
                  onChange={handleFormChange}
                  placeholder="예: stibee, community, sms"
                  className={inputClass}
                />
              </div>

              {/* campaign */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">utm_campaign</label>
                <input
                  name="campaign"
                  type="text"
                  value={form.campaign}
                  onChange={handleFormChange}
                  placeholder="예: 2026_07_habit"
                  className={inputClass}
                />
              </div>

              {/* content */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">utm_content</label>
                <input
                  name="content"
                  type="text"
                  value={form.content}
                  onChange={handleFormChange}
                  placeholder="예: email_01_open"
                  className={inputClass}
                  list="content-suggestions"
                />
                {form.source && CONTENT_SUGGESTIONS[form.source] && (
                  <datalist id="content-suggestions">
                    {CONTENT_SUGGESTIONS[form.source].map(s => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                )}
                {form.source && CONTENT_SUGGESTIONS[form.source] && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {CONTENT_SUGGESTIONS[form.source].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, content: s }))}
                        className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 hover:border-[#28B8D1] hover:text-[#28B8D1] transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 라벨 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">라벨 (통계 표시명)</label>
                <input
                  name="label"
                  type="text"
                  value={form.label}
                  onChange={handleFormChange}
                  placeholder="예: 이메일 1차 모집 안내"
                  className={inputClass}
                />
              </div>

              {/* 메모 */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1">메모</label>
                <input
                  name="memo"
                  type="text"
                  value={form.memo}
                  onChange={handleFormChange}
                  placeholder="내부 메모"
                  className={inputClass}
                />
              </div>
            </div>

            {/* 생성된 URL 미리보기 */}
            {generatedUrl && (
              <div className="mt-5 bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">생성된 링크</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-[#28B8D1] break-all font-mono bg-white border border-gray-200 rounded-lg px-3 py-2">
                    {generatedUrl}
                  </code>
                  <button
                    type="button"
                    onClick={() => copy(generatedUrl, 'preview')}
                    className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-500 hover:border-[#28B8D1] hover:text-[#28B8D1] transition-colors"
                  >
                    {copied === 'preview' ? '복사됨!' : '복사'}
                  </button>
                </div>
              </div>
            )}

            {formError && (
              <p className="mt-3 text-xs text-[#FF7789] bg-[#FF7789]/5 rounded-xl px-3 py-2">{formError}</p>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => { setForm(EMPTY_FORM); setFormError(''); }}
                className="px-4 py-2.5 border border-gray-200 text-gray-500 text-sm font-medium rounded-xl hover:border-gray-300 transition-colors"
              >
                초기화
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={formLoading || !form.source || !generatedUrl}
                className="flex-1 bg-[#28B8D1] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1fa8bf] disabled:opacity-50 transition-colors"
              >
                {formLoading ? '저장 중...' : '링크 저장하기'}
              </button>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            SECTION 3: 생성된 UTM 링크 목록
        ════════════════════════════════════════════════ */}
        <section>
          <h2 className="text-base font-bold text-[#1a1a2e] mb-4">생성된 UTM 링크 목록</h2>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {utmLinks.length === 0 ? (
              <div className="py-14 text-center text-gray-300 text-sm">생성된 UTM 링크가 없습니다.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">라벨</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">챌린지 월</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">채널</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">content</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">메모</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">생성일</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">링크</th>
                    </tr>
                  </thead>
                  <tbody>
                    {utmLinks.map(link => (
                      <tr key={link.id} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors">
                        <td className="px-4 py-3 font-medium text-[#1a1a2e]">
                          {link.label ?? <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {link.challenge_month ? formatChallengeMonth(link.challenge_month) : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-4 py-3">
                          {link.source ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#28B8D1]/10 text-[#28B8D1]">
                              {SOURCE_LABELS[link.source] ?? link.source}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {link.content ?? <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs max-w-[140px] truncate" title={link.memo ?? ''}>
                          {link.memo ?? <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{formatDateTime(link.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#28B8D1] hover:underline max-w-[180px] truncate block"
                              title={link.url}
                            >
                              {link.url}
                            </a>
                            <button
                              type="button"
                              onClick={() => copy(link.url, link.id)}
                              className="flex-shrink-0 text-[11px] px-2 py-0.5 rounded-lg border border-gray-200 text-gray-400 hover:border-[#28B8D1] hover:text-[#28B8D1] transition-colors"
                            >
                              {copied === link.id ? '복사됨!' : '복사'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="px-5 py-3 border-t border-gray-50 text-xs text-gray-400">
              {utmLinks.length}개의 UTM 링크
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
