'use client';

import { useState, useEffect, useCallback } from 'react';

type RecruitmentSettings = {
  id: string;
  title: string | null;
  is_open: boolean;
  open_at: string | null;
  close_at: string | null;
  challenge_month: string | null;
  created_at: string;
  updated_at: string;
};

type Notification = {
  id: string;
  phone: string;
  memo: string | null;
  created_at: string;
};

type ModalMode = 'add' | 'edit' | null;

function toKSTInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 16);
}

function fromKSTInput(localStr: string): string | null {
  if (!localStr) return null;
  return new Date(localStr + ':00+09:00').toISOString();
}

function formatKST(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

function formatChallengeMonth(month: string | null): string {
  if (!month) return '-';
  const [year, m] = month.split('-');
  if (!year || !m) return month;
  return `${year}년 ${parseInt(m, 10)}월`;
}

function maskPhone(phone: string): string {
  return phone.replace(/^(\d{3})\d+(\d{4})$/, '$1****$2');
}

function isCurrentlyActive(s: RecruitmentSettings): boolean {
  if (!s.is_open) return false;
  const now = new Date();
  if (s.open_at && now < new Date(s.open_at)) return false;
  if (s.close_at && now >= new Date(s.close_at)) return false;
  return true;
}

function downloadCSV(notifications: Notification[]) {
  const header = '번호,신청일시(KST)';
  const rows = notifications.map((n) => `${n.phone},"${formatKST(n.created_at)}"`);
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `다음모집알림신청_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const EMPTY_FORM = {
  title: '습관챌린지',
  challengeMonth: '',
  isOpen: false,
  openAt: '',
  closeAt: '',
  closeOthers: true,
};

export default function RecruitmentPage() {
  const [settings, setSettings] = useState<RecruitmentSettings[]>([]);
  const [activeSettings, setActiveSettings] = useState<RecruitmentSettings | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Modal
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState(EMPTY_FORM.title);
  const [formChallengeMonth, setFormChallengeMonth] = useState(EMPTY_FORM.challengeMonth);
  const [formIsOpen, setFormIsOpen] = useState(EMPTY_FORM.isOpen);
  const [formOpenAt, setFormOpenAt] = useState(EMPTY_FORM.openAt);
  const [formCloseAt, setFormCloseAt] = useState(EMPTY_FORM.closeAt);
  const [formCloseOthers, setFormCloseOthers] = useState(EMPTY_FORM.closeOthers);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await fetch('/api/admin/recruitment');
      const data = (await res.json()) as {
        settings: RecruitmentSettings[];
        activeSettings: RecruitmentSettings | null;
        notificationCount: number;
        notifications: Notification[];
      };
      setSettings(data.settings ?? []);
      setActiveSettings(data.activeSettings ?? null);
      setNotificationCount(data.notificationCount ?? 0);
      setNotifications(data.notifications ?? []);
    } catch {
      setFetchError('데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setEditingId(null);
    setFormTitle(EMPTY_FORM.title);
    setFormChallengeMonth(EMPTY_FORM.challengeMonth);
    setFormIsOpen(EMPTY_FORM.isOpen);
    setFormOpenAt(EMPTY_FORM.openAt);
    setFormCloseAt(EMPTY_FORM.closeAt);
    setFormCloseOthers(EMPTY_FORM.closeOthers);
    setSaveMessage('');
    setSaveError('');
    setModalMode('add');
  };

  const openEdit = (s: RecruitmentSettings) => {
    setEditingId(s.id);
    setFormTitle(s.title ?? '');
    setFormChallengeMonth(s.challenge_month ?? '');
    setFormIsOpen(s.is_open);
    setFormOpenAt(toKSTInput(s.open_at));
    setFormCloseAt(toKSTInput(s.close_at));
    setFormCloseOthers(true);
    setSaveMessage('');
    setSaveError('');
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setSaveMessage('');
    setSaveError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');
    setSaveError('');

    const body = {
      id: modalMode === 'edit' ? editingId : undefined,
      title: formTitle || null,
      is_open: formIsOpen,
      open_at: fromKSTInput(formOpenAt),
      close_at: fromKSTInput(formCloseAt),
      challenge_month: formChallengeMonth || null,
      close_others: formIsOpen && formCloseOthers,
    };

    try {
      const res = await fetch('/api/admin/recruitment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { data?: RecruitmentSettings; error?: string };
      if (!res.ok) {
        setSaveError(data.error ?? '저장 중 오류가 발생했습니다.');
        return;
      }
      setSaveMessage('저장되었습니다.');
      await fetchData();
      setTimeout(() => {
        closeModal();
      }, 800);
    } catch {
      setSaveError('네트워크 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center">
        <p className="text-gray-400 text-sm">불러오는 중...</p>
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

  return (
    <div className="min-h-screen bg-[#F2F2F7] py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#1a1a2e]">모집 설정</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {activeSettings
                ? `현재 활성: ${formatChallengeMonth(activeSettings.challenge_month)} — ${activeSettings.title ?? '제목 없음'}`
                : '현재 활성 모집 없음'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={[
                'text-xs font-bold px-3 py-1.5 rounded-full',
                activeSettings
                  ? 'bg-green-100 text-green-700'
                  : 'bg-[#FF7789]/10 text-[#FF7789]',
              ].join(' ')}
            >
              {activeSettings ? '● 모집 중' : '● 모집 마감'}
            </span>
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#28B8D1] text-white text-sm font-semibold hover:bg-[#1fa8bf] transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              새 모집 추가
            </button>
          </div>
        </div>

        {/* 모집 설정 목록 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-[#1a1a2e]">모집 회차 목록</h2>
          </div>

          {settings.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-sm text-gray-400 mb-3">등록된 모집 설정이 없습니다.</p>
              <button
                onClick={openAdd}
                className="text-sm text-[#28B8D1] font-semibold underline underline-offset-2"
              >
                첫 모집 추가하기
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">챌린지 월</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">제목</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">모집 상태</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">모집 시작일</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">모집 마감일</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {settings.map((s) => {
                    const active = isCurrentlyActive(s);
                    const isThisActive = activeSettings?.id === s.id;
                    return (
                      <tr
                        key={s.id}
                        className={`hover:bg-gray-50/50 transition-colors ${isThisActive ? 'bg-green-50/40' : ''}`}
                      >
                        <td className="px-4 py-3 font-medium text-[#1a1a2e]">
                          <div className="flex items-center gap-2">
                            {formatChallengeMonth(s.challenge_month)}
                            {isThisActive && (
                              <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                                활성
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{s.title ?? <span className="text-gray-300">-</span>}</td>
                        <td className="px-4 py-3">
                          {active ? (
                            <span className="inline-flex items-center text-xs font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                              ● 모집 중
                            </span>
                          ) : s.is_open ? (
                            <span className="inline-flex items-center text-xs font-bold bg-amber-100 text-amber-600 px-2.5 py-1 rounded-full">
                              ○ 열림 (기간 외)
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs font-medium bg-gray-100 text-gray-400 px-2.5 py-1 rounded-full">
                              ● 마감
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {s.open_at ? toKSTInput(s.open_at).replace('T', ' ') : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {s.close_at ? toKSTInput(s.close_at).replace('T', ' ') : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openEdit(s)}
                            className="text-xs font-semibold text-[#28B8D1] hover:text-[#1fa8bf] transition-colors"
                          >
                            수정
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 다음 모집 알림 신청자 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-[#1a1a2e]">다음 모집 알림 신청자</h2>
              <p className="text-xs text-gray-400 mt-0.5">총 {notificationCount}명</p>
            </div>
            {notifications.length > 0 && (
              <button
                onClick={() => downloadCSV(notifications)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#F2F2F7] text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                CSV 다운로드
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">알림 신청자가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-bold text-gray-400 pb-3 pr-6">번호</th>
                    <th className="text-left text-xs font-bold text-gray-400 pb-3">신청일시 (KST)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {notifications.map((n) => (
                    <tr key={n.id}>
                      <td className="py-3 pr-6 font-medium text-[#1a1a2e]">{maskPhone(n.phone)}</td>
                      <td className="py-3 text-gray-500 text-xs">{formatKST(n.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* 추가/수정 모달 */}
      {modalMode !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-base font-bold text-[#1a1a2e]">
                {modalMode === 'add' ? '새 모집 추가' : '모집 설정 수정'}
              </h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>

            {/* 모달 폼 */}
            <div className="px-6 py-5 space-y-4">

              {/* 제목 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  제목
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="습관챌린지"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#28B8D1]/30 focus:border-[#28B8D1] transition-all text-sm text-[#1a1a2e]"
                />
              </div>

              {/* 챌린지 월 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  챌린지 월
                </label>
                <input
                  type="text"
                  value={formChallengeMonth}
                  onChange={(e) => setFormChallengeMonth(e.target.value)}
                  placeholder="예: 2026-07"
                  className="w-full sm:w-44 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#28B8D1]/30 focus:border-[#28B8D1] transition-all text-sm text-[#1a1a2e] font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">YYYY-MM 형식으로 입력 (예: 2026-07)</p>
              </div>

              {/* is_open 토글 */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormIsOpen((v) => !v)}
                  className={[
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                    formIsOpen ? 'bg-[#28B8D1]' : 'bg-gray-200',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out',
                      formIsOpen ? 'translate-x-5' : 'translate-x-0',
                    ].join(' ')}
                  />
                </button>
                <span className="text-sm font-medium text-[#1a1a2e]">
                  {formIsOpen ? '모집 열림 (is_open = true)' : '모집 닫힘 (is_open = false)'}
                </span>
              </div>

              {/* 다른 모집 자동 닫기 (is_open=true일 때만 표시) */}
              {formIsOpen && (
                <div className="bg-[#28B8D1]/5 border border-[#28B8D1]/20 rounded-xl px-4 py-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formCloseOthers}
                      onChange={(e) => setFormCloseOthers(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 accent-[#28B8D1] cursor-pointer flex-shrink-0"
                    />
                    <span className="text-sm text-gray-600">
                      <span className="font-semibold text-[#1a1a2e]">다른 모집 자동 닫기</span>
                      <span className="ml-1 text-xs text-gray-400">— 이 모집만 열리도록 나머지를 마감 처리</span>
                    </span>
                  </label>
                </div>
              )}

              {/* 날짜 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    모집 시작일시 (KST)
                  </label>
                  <input
                    type="datetime-local"
                    value={formOpenAt}
                    onChange={(e) => setFormOpenAt(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#28B8D1]/30 focus:border-[#28B8D1] transition-all text-sm text-[#1a1a2e]"
                  />
                  <p className="text-xs text-gray-400 mt-1">비워두면 즉시 시작</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    모집 마감일시 (KST)
                  </label>
                  <input
                    type="datetime-local"
                    value={formCloseAt}
                    onChange={(e) => setFormCloseAt(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#28B8D1]/30 focus:border-[#28B8D1] transition-all text-sm text-[#1a1a2e]"
                  />
                  <p className="text-xs text-gray-400 mt-1">비워두면 마감 없음</p>
                </div>
              </div>

              {/* 피드백 */}
              {saveMessage && (
                <p className="text-sm text-green-600 font-medium bg-green-50 rounded-xl px-4 py-2.5">
                  {saveMessage}
                </p>
              )}
              {saveError && (
                <p className="text-sm text-[#FF7789] bg-[#FF7789]/5 rounded-xl px-4 py-2.5">
                  {saveError}
                </p>
              )}

              {/* 버튼 */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 border border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm font-medium hover:border-gray-300 transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-[#28B8D1] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1fa8bf] disabled:opacity-50 transition-colors"
                >
                  {saving ? '저장 중...' : modalMode === 'add' ? '추가' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
