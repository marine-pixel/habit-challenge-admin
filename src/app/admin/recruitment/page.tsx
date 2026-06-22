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
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

function maskPhone(phone: string): string {
  return phone.replace(/^(\d{3})\d+(\d{4})$/, '$1****$2');
}

function downloadCSV(notifications: Notification[]) {
  const header = '번호,신청일시(KST)';
  const rows = notifications.map((n) => {
    const kst = formatKST(n.created_at);
    return `${n.phone},"${kst}"`;
  });
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `다음모집알림신청_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RecruitmentPage() {
  const [settings, setSettings] = useState<RecruitmentSettings | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);

  const [title, setTitle] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [openAt, setOpenAt] = useState('');
  const [closeAt, setCloseAt] = useState('');
  const [challengeMonth, setChallengeMonth] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/recruitment');
      const data = (await res.json()) as {
        settings: RecruitmentSettings | null;
        notificationCount: number;
        notifications: Notification[];
      };
      setSettings(data.settings);
      setNotificationCount(data.notificationCount);
      setNotifications(data.notifications);

      if (data.settings) {
        setTitle(data.settings.title ?? '');
        setIsOpen(data.settings.is_open);
        setOpenAt(toKSTInput(data.settings.open_at));
        setCloseAt(toKSTInput(data.settings.close_at));
        setChallengeMonth(data.settings.challenge_month ?? '');
      }
    } catch {
      setSaveError('데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function handleSave() {
    setSaving(true);
    setSaveMessage('');
    setSaveError('');

    const body = {
      id: settings?.id,
      title: title || null,
      is_open: isOpen,
      open_at: fromKSTInput(openAt),
      close_at: fromKSTInput(closeAt),
      challenge_month: challengeMonth || null,
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

      if (data.data) setSettings(data.data);
      setSaveMessage('저장되었습니다.');
    } catch {
      setSaveError('네트워크 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  const isCurrentlyOpen = (() => {
    if (!settings || !settings.is_open) return false;
    const now = new Date();
    if (settings.open_at && now < new Date(settings.open_at)) return false;
    if (settings.close_at && now >= new Date(settings.close_at)) return false;
    return true;
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center">
        <p className="text-gray-400 text-sm">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#1a1a2e]">모집 설정</h1>
          <span
            className={[
              'text-xs font-bold px-3 py-1.5 rounded-full',
              isCurrentlyOpen
                ? 'bg-green-100 text-green-700'
                : 'bg-[#FF7789]/10 text-[#FF7789]',
            ].join(' ')}
          >
            {isCurrentlyOpen ? '● 모집 중' : '● 모집 마감'}
          </span>
        </div>

        {/* 모집 설정 카드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-[#1a1a2e] mb-5">모집 설정</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
                제목
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="습관챌린지"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#28B8D1]/30 focus:border-[#28B8D1] transition-all text-sm text-[#1a1a2e]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
                챌린지 월
              </label>
              <input
                type="text"
                value={challengeMonth}
                onChange={(e) => setChallengeMonth(e.target.value)}
                placeholder="예: 2026-07"
                className="w-full sm:w-40 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#28B8D1]/30 focus:border-[#28B8D1] transition-all text-sm text-[#1a1a2e] font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">
                {challengeMonth
                  ? `신청자 자동 저장 시 challenge_month = "${challengeMonth}"`
                  : 'YYYY-MM 형식으로 입력. 비워두면 open_at 기준으로 자동 설정'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                className={[
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                  isOpen ? 'bg-[#28B8D1]' : 'bg-gray-200',
                ].join(' ')}
              >
                <span
                  className={[
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out',
                    isOpen ? 'translate-x-5' : 'translate-x-0',
                  ].join(' ')}
                />
              </button>
              <span className="text-sm font-medium text-[#1a1a2e]">
                {isOpen ? '모집 열림 (is_open = true)' : '모집 닫힘 (is_open = false)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
                  모집 시작일시 (KST)
                </label>
                <input
                  type="datetime-local"
                  value={openAt}
                  onChange={(e) => setOpenAt(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#28B8D1]/30 focus:border-[#28B8D1] transition-all text-sm text-[#1a1a2e]"
                />
                <p className="text-xs text-gray-400 mt-1">비워두면 즉시 시작</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
                  모집 마감일시 (KST)
                </label>
                <input
                  type="datetime-local"
                  value={closeAt}
                  onChange={(e) => setCloseAt(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#28B8D1]/30 focus:border-[#28B8D1] transition-all text-sm text-[#1a1a2e]"
                />
                <p className="text-xs text-gray-400 mt-1">비워두면 마감 없음</p>
              </div>
            </div>
          </div>

          {saveMessage && (
            <p className="mt-4 text-sm text-green-600 font-medium">{saveMessage}</p>
          )}
          {saveError && (
            <p className="mt-4 text-sm text-red-500">{saveError}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-5 w-full sm:w-auto px-8 py-2.5 bg-[#28B8D1] text-white rounded-xl font-bold text-sm hover:bg-[#1fa8bf] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>

        {/* 다음 모집 알림 신청자 카드 */}
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
                      <td className="py-3 pr-6 font-medium text-[#1a1a2e]">
                        {maskPhone(n.phone)}
                      </td>
                      <td className="py-3 text-gray-500 text-xs">
                        {formatKST(n.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
