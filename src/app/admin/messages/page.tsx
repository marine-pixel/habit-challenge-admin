'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

type Channel = 'alimtalk' | 'lms' | 'email';
type MessageCategory = 'payment' | 'complete' | 'start' | 'reminder' | 'misc';

interface VariableEntry {
  key: string;
  value: string;
}

interface MessageTemplate {
  id: string;
  name: string;
  trigger_type: string;
  channel: Channel;
  message_category: string; // string to allow legacy category values from DB
  solapi_template_code: string | null;
  solapi_pf_id: string | null;
  title: string | null;
  body: string | null;
  variables: Array<VariableEntry | string> | null;
  is_active: boolean;
  memo: string | null;
  created_at: string;
  updated_at: string | null;
}

interface FormValues {
  name: string;
  message_category: string;
  channel: string;
  solapi_template_code: string;
  solapi_pf_id: string;
  title: string;
  body: string;
  variables: VariableEntry[];
  is_active: boolean;
  memo: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  payment: '입금',
  complete: '완료',
  start: '시작',
  reminder: '리마인드',
  misc: '기타',
  // 레거시 값 — graceful display
  boosting: '기타(구)',
  operation: '기타(구)',
};

const CATEGORY_BADGE_CLASS: Record<string, string> = {
  payment: 'bg-green-100 text-green-700',
  complete: 'bg-blue-100 text-blue-700',
  start: 'bg-[#28B8D1]/10 text-[#28B8D1]',
  reminder: 'bg-amber-100 text-amber-700',
  misc: 'bg-gray-100 text-gray-600',
  // 레거시
  boosting: 'bg-gray-100 text-gray-500',
  operation: 'bg-gray-100 text-gray-500',
};

const CHANNEL_BADGE_CLASS: Record<Channel, string> = {
  alimtalk: 'bg-[#28B8D1]/10 text-[#28B8D1] border border-[#28B8D1]/20',
  lms: 'bg-[#FF7789]/10 text-[#FF7789] border border-[#FF7789]/20',
  email: 'bg-orange-100 text-orange-700 border border-orange-200',
};

const CHANNEL_LABELS: Record<Channel, string> = {
  alimtalk: '알림톡',
  lms: 'LMS',
  email: '이메일',
};

const CATEGORY_OPTIONS: { value: MessageCategory; label: string }[] = [
  { value: 'payment', label: '입금' },
  { value: 'complete', label: '완료' },
  { value: 'start', label: '시작' },
  { value: 'reminder', label: '리마인드' },
  { value: 'misc', label: '기타' },
];

const EMPTY_FORM: FormValues = {
  name: '',
  message_category: '',
  channel: '',
  solapi_template_code: '',
  solapi_pf_id: '',
  title: '',
  body: '',
  variables: [],
  is_active: true,
  memo: '',
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function parseVariables(vars: Array<VariableEntry | string> | null): VariableEntry[] {
  if (!vars || vars.length === 0) return [];
  return vars.map(v => (typeof v === 'string' ? { key: v, value: v } : v));
}

function countVariables(vars: Array<VariableEntry | string> | null): number {
  return vars?.length ?? 0;
}

export default function MessagesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | Channel>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [formValues, setFormValues] = useState<FormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/admin/message-templates');
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? '데이터를 불러오지 못했습니다.');
      }
      const json = await res.json() as { data: MessageTemplate[] };
      setTemplates(json.data ?? []);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const summary = useMemo(() => ({
    total: templates.length,
    alimtalk: templates.filter(t => t.channel === 'alimtalk').length,
    lms: templates.filter(t => t.channel === 'lms').length,
    email: templates.filter(t => t.channel === 'email').length,
    active: templates.filter(t => t.is_active).length,
  }), [templates]);

  const filtered = useMemo(() => {
    let list = [...templates];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.title ?? '').toLowerCase().includes(q) ||
        (t.body ?? '').toLowerCase().includes(q) ||
        (t.memo ?? '').toLowerCase().includes(q) ||
        (t.solapi_template_code ?? '').toLowerCase().includes(q)
      );
    }
    if (channelFilter !== 'all') list = list.filter(t => t.channel === channelFilter);
    if (categoryFilter !== 'all') list = list.filter(t => t.message_category === categoryFilter);
    if (activeFilter === 'active') list = list.filter(t => t.is_active);
    if (activeFilter === 'inactive') list = list.filter(t => !t.is_active);
    list.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, 'ko-KR');
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [templates, search, channelFilter, categoryFilter, activeFilter, sortOrder]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 템플릿을 삭제하시겠습니까?\n삭제된 템플릿은 복구할 수 없습니다.`)) return;
    setDeletingId(id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/message-templates/${id}`, { method: 'DELETE' });
      const json = await res.json() as { success?: boolean; deleted?: boolean; message?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? '삭제 실패');
      if (json.deleted === false && json.message) {
        alert(json.message);
      }
      await fetchData();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : '삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  const openAdd = () => {
    setFormValues(EMPTY_FORM);
    setFormError(null);
    setEditingId(null);
    setModalMode('add');
  };

  const openEdit = (template: MessageTemplate) => {
    setFormValues({
      name: template.name,
      message_category: template.message_category,
      channel: template.channel,
      solapi_template_code: template.solapi_template_code ?? '',
      solapi_pf_id: template.solapi_pf_id ?? '',
      title: template.title ?? '',
      body: template.body ?? '',
      variables: parseVariables(template.variables),
      is_active: template.is_active,
      memo: template.memo ?? '',
    });
    setFormError(null);
    setEditingId(template.id);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setFormError(null);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormValues(prev => ({ ...prev, [name]: checked } as FormValues));
    } else {
      setFormValues(prev => ({ ...prev, [name]: value } as FormValues));
    }
  };

  const addVariable = () => {
    setFormValues(prev => ({
      ...prev,
      variables: [...prev.variables, { key: '', value: '' }],
    }));
  };

  const removeVariable = (idx: number) => {
    setFormValues(prev => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== idx),
    }));
  };

  const updateVariable = (idx: number, field: 'key' | 'value', val: string) => {
    setFormValues(prev => ({
      ...prev,
      variables: prev.variables.map((v, i) => (i === idx ? { ...v, [field]: val } : v)),
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValues.name.trim()) { setFormError('템플릿 이름은 필수입니다.'); return; }
    if (!formValues.message_category) { setFormError('메시지 카테고리는 필수입니다.'); return; }
    if (!formValues.channel) { setFormError('채널은 필수입니다.'); return; }
    if (formValues.channel === 'lms' && !formValues.body.trim()) {
      setFormError('LMS 채널은 본문이 필수입니다.'); return;
    }
    if (formValues.channel === 'email' && !formValues.title.trim()) {
      setFormError('이메일 채널은 제목(이메일 제목)이 필수입니다.'); return;
    }
    if (formValues.channel === 'email' && !formValues.body.trim()) {
      setFormError('이메일 채널은 본문이 필수입니다.'); return;
    }
    if (formValues.channel === 'alimtalk' && !formValues.solapi_template_code.trim()) {
      setFormError('알림톡 채널은 SOLAPI 템플릿 코드가 필수입니다.'); return;
    }

    setFormLoading(true);
    setFormError(null);
    try {
      const validVariables = formValues.variables
        .filter(v => v.key.trim() || v.value.trim())
        .map(v => ({ key: v.key.trim(), value: v.value.trim() }));

      const payload = {
        name: formValues.name.trim(),
        message_category: formValues.message_category,
        channel: formValues.channel,
        solapi_template_code: formValues.solapi_template_code.trim() || null,
        solapi_pf_id: formValues.solapi_pf_id.trim() || null,
        title: formValues.title.trim() || null,
        body: formValues.body.trim(),
        variables: validVariables.length > 0 ? validVariables : null,
        is_active: formValues.is_active,
        memo: formValues.memo.trim() || null,
      };

      const url = modalMode === 'edit' && editingId
        ? `/api/admin/message-templates/${editingId}`
        : '/api/admin/message-templates';
      const method = modalMode === 'edit' ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
        <button onClick={fetchData} className="text-sm text-[#28B8D1] underline">다시 시도</button>
      </div>
    );
  }

  const isAlimtalk = formValues.channel === 'alimtalk';
  const isEmail = formValues.channel === 'email';

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">세시간전 습관챌린지</p>
            <h1 className="text-2xl font-bold text-[#1a1a2e]">메시지 관리</h1>
            <p className="text-sm text-gray-400 mt-1">
              알림톡/LMS 템플릿을 관리하고, 발송 전 메시지 내용을 확인합니다.
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#28B8D1] text-white text-sm font-semibold hover:bg-[#1fa8bf] transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            템플릿 추가
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
          {[
            { label: '전체 템플릿', value: summary.total, color: 'text-[#1a1a2e]', dot: 'bg-gray-300' },
            { label: '알림톡', value: summary.alimtalk, color: 'text-[#28B8D1]', dot: 'bg-[#28B8D1]' },
            { label: 'LMS', value: summary.lms, color: 'text-[#FF7789]', dot: 'bg-[#FF7789]' },
            { label: '이메일', value: summary.email, color: 'text-orange-600', dot: 'bg-orange-500' },
            { label: '사용 중', value: summary.active, color: 'text-green-600', dot: 'bg-green-500' },
          ].map(({ label, value, color, dot }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                <p className="text-xs text-gray-400 font-medium">{label}</p>
              </div>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="템플릿 이름, 제목, 본문, 메모, SOLAPI 코드 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-[220px] border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#28B8D1] transition-colors"
            />
            <select
              value={channelFilter}
              onChange={e => setChannelFilter(e.target.value as 'all' | Channel)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-600"
            >
              <option value="all">전체 채널</option>
              <option value="alimtalk">알림톡</option>
              <option value="lms">LMS</option>
              <option value="email">이메일</option>
            </select>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-600"
            >
              <option value="all">전체 카테고리</option>
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={activeFilter}
              onChange={e => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-600"
            >
              <option value="all">전체 상태</option>
              <option value="active">사용 중</option>
              <option value="inactive">미사용</option>
            </select>
            <button
              onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:border-[#28B8D1] hover:text-[#28B8D1] transition-colors"
              title="이름순 정렬"
            >
              이름순 {sortOrder === 'asc' ? 'ㄱ→ㅎ' : 'ㅎ→ㄱ'}
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

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">템플릿 이름</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">카테고리</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">채널</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">SOLAPI 코드</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">제목</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">변수</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">사용 여부</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">수정일</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">관리</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-14 text-gray-300 text-sm">
                      템플릿이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filtered.map(t => (
                    <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-3 font-medium text-[#1a1a2e] max-w-[180px]">
                        <div className="truncate" title={t.name}>{t.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-full ${CATEGORY_BADGE_CLASS[t.message_category] ?? 'bg-gray-100 text-gray-600'}`}>
                          {CATEGORY_LABELS[t.message_category] ?? t.message_category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full ${CHANNEL_BADGE_CLASS[t.channel] ?? 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                          {CHANNEL_LABELS[t.channel] ?? t.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {t.solapi_template_code ?? <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-[160px]">
                        <div className="truncate text-xs" title={t.title ?? ''}>
                          {t.title ?? <span className="text-gray-300">-</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {countVariables(t.variables) > 0
                          ? <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">{countVariables(t.variables)}</span>
                          : <span className="text-gray-300 text-xs">-</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                          t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${t.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                          {t.is_active ? '사용 중' : '미사용'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(t.updated_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEdit(t)}
                            className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:border-[#28B8D1] hover:text-[#28B8D1] transition-colors"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDelete(t.id, t.name)}
                            disabled={deletingId === t.id}
                            className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-400 hover:border-[#FF7789] hover:text-[#FF7789] transition-colors disabled:opacity-40"
                          >
                            {deletingId === t.id ? '삭제 중' : '삭제'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-400">
              {filtered.length}개 표시 중
              {filtered.length !== templates.length && ` (전체 ${templates.length}개)`}
            </p>
            {deleteError && (
              <p className="text-xs text-[#FF7789]">삭제 오류: {deleteError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalMode !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-base font-bold text-[#1a1a2e]">
                {modalMode === 'add' ? '템플릿 추가' : '템플릿 수정'}
              </h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="px-6 py-5 space-y-4">

              {/* 템플릿 이름 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  템플릿 이름 <span className="text-[#FF7789]">*</span>
                </label>
                <input
                  name="name"
                  type="text"
                  value={formValues.name}
                  onChange={handleFormChange}
                  placeholder="예: 신청완료 입금요청 알림톡"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] transition-colors"
                />
              </div>

              {/* 카테고리 + 채널 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    메시지 카테고리 <span className="text-[#FF7789]">*</span>
                  </label>
                  <select
                    name="message_category"
                    value={formValues.message_category}
                    onChange={handleFormChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-700"
                  >
                    <option value="">선택</option>
                    {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    채널 <span className="text-[#FF7789]">*</span>
                  </label>
                  <select
                    name="channel"
                    value={formValues.channel}
                    onChange={handleFormChange}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-700"
                  >
                    <option value="">선택</option>
                    <option value="alimtalk">알림톡</option>
                    <option value="lms">LMS</option>
                    <option value="email">이메일</option>
                  </select>
                </div>
              </div>

              {/* SOLAPI 템플릿 코드 — 이메일 채널에서는 숨김 */}
              {!isEmail && (
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isAlimtalk ? 'text-[#28B8D1]' : 'text-gray-500'}`}>
                    SOLAPI 템플릿 코드
                    {isAlimtalk
                      ? <span className="text-[#FF7789] ml-1">*</span>
                      : <span className="ml-1 font-normal text-gray-400">(선택)</span>
                    }
                  </label>
                  <input
                    name="solapi_template_code"
                    type="text"
                    value={formValues.solapi_template_code}
                    onChange={handleFormChange}
                    placeholder="예: KA01TP..."
                    className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors ${
                      isAlimtalk
                        ? 'border-[#28B8D1]/50 bg-[#28B8D1]/5 focus:border-[#28B8D1]'
                        : 'border-gray-200 focus:border-[#28B8D1]'
                    }`}
                  />
                </div>
              )}

              {/* SOLAPI PF ID — 이메일 채널에서는 숨김 */}
              {!isEmail && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    SOLAPI PF ID <span className="ml-1 font-normal text-gray-400">(선택)</span>
                  </label>
                  <input
                    name="solapi_pf_id"
                    type="text"
                    value={formValues.solapi_pf_id}
                    onChange={handleFormChange}
                    placeholder="예: PF_..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] transition-colors"
                  />
                </div>
              )}

              {/* 제목 */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isEmail ? 'text-orange-600' : 'text-gray-500'}`}>
                  {isEmail ? '이메일 제목' : `제목${formValues.channel === 'lms' ? ' (LMS 제목)' : ''}`}
                  {isEmail
                    ? <span className="text-[#FF7789] ml-1">*</span>
                    : <span className="ml-1 font-normal text-gray-400">(선택)</span>
                  }
                </label>
                <input
                  name="title"
                  type="text"
                  value={formValues.title}
                  onChange={handleFormChange}
                  placeholder={isEmail ? '예: [세시간전] 습관챌린지 참가비 입금 안내' : ''}
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors ${
                    isEmail
                      ? 'border-orange-300 bg-orange-50 focus:border-orange-500'
                      : 'border-gray-200 focus:border-[#28B8D1]'
                  }`}
                />
                {isEmail && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    제목에도 {'{{nickname}}'} 등 변수를 사용할 수 있습니다.
                  </p>
                )}
              </div>

              {/* 본문 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  본문
                  {(formValues.channel === 'lms' || isEmail)
                    ? <span className="text-[#FF7789] ml-1">*</span>
                    : <span className="ml-1 font-normal text-gray-400">(선택)</span>
                  }
                </label>
                <textarea
                  name="body"
                  value={formValues.body}
                  onChange={handleFormChange}
                  rows={isEmail ? 8 : 6}
                  placeholder={
                    isAlimtalk
                      ? '관리용 참고 문구를 입력하세요 (선택)'
                      : isEmail
                        ? '이메일 본문을 입력하세요.\n예: 안녕하세요, {{nickname}}님!\nAID: {{aid}}'
                        : '메시지 본문을 입력하세요'
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] resize-none transition-colors"
                />
                {isAlimtalk && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    알림톡은 SOLAPI에 검수 완료된 템플릿 코드로 발송됩니다. 본문은 관리용 참고 문구로만 사용됩니다.
                  </p>
                )}
                {formValues.channel === 'lms' && (
                  <p className="text-xs text-[#28B8D1] mt-1.5">
                    LMS는 이 본문이 실제 발송 문구로 사용됩니다.
                  </p>
                )}
                {isEmail && (
                  <p className="text-xs text-orange-600 mt-1.5">
                    이메일 본문이 실제 발송 문구로 사용됩니다. 줄바꿈이 그대로 반영됩니다.
                    <br />
                    사용 가능 변수: {'{{'+'nickname'+'}}'}, {'{{'+'aid'+'}}'}, {'{{'+'email'+'}}'}, {'{{'+'phone'+'}}'}, {'{{'+'blog_url'+'}}'}, {'{{'+'class_type'+'}}'}, {'{{'+'writing_goal'+'}}'}, {'{{'+'personal_goal'+'}}'}
                  </p>
                )}
              </div>

              {/* 변수 매핑 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  {isAlimtalk ? '알림톡 변수 매핑' : isEmail ? '추가 변수 메모' : '문자 치환 변수'}
                  <span className="ml-1 font-normal text-gray-400">(선택)</span>
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  {isAlimtalk
                    ? 'SOLAPI 템플릿에 등록된 변수명과 실제 넣을 값을 매핑해주세요. 예: #{마감기간} = 5/31'
                    : isEmail
                      ? '이메일 본문에는 {{nickname}}, {{aid}} 등 변수를 직접 입력하면 자동 치환됩니다. 이 항목은 관리 메모용입니다.'
                      : 'LMS 본문에서 사용할 치환값을 관리합니다. 실제 자동 치환은 발송 단계에서 연결합니다.'}
                </p>
                <div className="space-y-2">
                  {formValues.variables.length > 0 && (
                    <div className="flex gap-2">
                      <span className="flex-1 text-xs text-gray-400 pl-1">변수명</span>
                      <span className="flex-1 text-xs text-gray-400 pl-1">변수값</span>
                      <span className="w-8 flex-shrink-0" />
                    </div>
                  )}
                  {formValues.variables.map((v, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={v.key}
                        onChange={e => updateVariable(idx, 'key', e.target.value)}
                        placeholder={isAlimtalk ? '예: #{마감기간}' : '예: nickname'}
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] transition-colors"
                      />
                      <input
                        type="text"
                        value={v.value}
                        onChange={e => updateVariable(idx, 'value', e.target.value)}
                        placeholder={isAlimtalk ? '예: 5/31' : '예: nickname'}
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => removeVariable(idx)}
                        className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#FF7789] hover:text-[#FF7789] transition-colors text-base leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addVariable}
                  className="flex items-center gap-1.5 mt-2 text-xs text-[#28B8D1] hover:underline"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  변수 추가
                </button>
              </div>

              {/* 사용 여부 */}
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formValues.is_active}
                    onChange={handleFormChange}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#28B8D1]" />
                </label>
                <span className="text-sm font-medium text-gray-700">
                  {formValues.is_active ? '사용 중' : '미사용'}
                </span>
              </div>

              {/* 메모 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  메모 <span className="ml-1 font-normal text-gray-400">(선택)</span>
                </label>
                <textarea
                  name="memo"
                  value={formValues.memo}
                  onChange={handleFormChange}
                  rows={2}
                  placeholder="관리자 메모"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] resize-none transition-colors"
                />
              </div>

              {formError && (
                <p className="text-xs text-[#FF7789] bg-[#FF7789]/5 rounded-xl px-3 py-2">
                  {formError}
                </p>
              )}

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
