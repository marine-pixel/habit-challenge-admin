'use client';

import { useState, useEffect, useCallback } from 'react';

type Channel = 'alimtalk' | 'email';
type LogStatus = 'success' | 'failed' | 'skipped';
type TriggerType = 'application_created' | 'payment_marked_paid';

interface MessageLog {
  id: string;
  channel: Channel;
  provider: string;
  trigger_type: TriggerType;
  template_name: string;
  template_code: string | null;
  status: LogStatus;
  applicant_id: string | null;
  aid: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  recipient_email: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const CHANNEL_LABELS: Record<Channel, string> = { alimtalk: '알림톡', email: '이메일' };
const CHANNEL_BADGE: Record<Channel, string> = {
  alimtalk: 'bg-[#28B8D1]/10 text-[#28B8D1] border border-[#28B8D1]/20',
  email: 'bg-purple-100 text-purple-700 border border-purple-200',
};
const STATUS_LABELS: Record<LogStatus, string> = { success: '성공', failed: '실패', skipped: '건너뜀' };
const STATUS_BADGE: Record<LogStatus, string> = {
  success: 'bg-green-100 text-green-700',
  failed: 'bg-[#FF7789]/10 text-[#FF7789]',
  skipped: 'bg-gray-100 text-gray-500',
};
const TRIGGER_LABELS: Record<TriggerType, string> = {
  application_created: '신청 완료',
  payment_marked_paid: '입금완료 변경',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function MessageLogsPage() {
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [triggerFilter, setTriggerFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (channelFilter) params.set('channel', channelFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (triggerFilter) params.set('trigger_type', triggerFilter);
      const res = await fetch(`/api/admin/message-logs?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? '데이터를 불러오지 못했습니다.');
      }
      const json = await res.json() as { data: MessageLog[] };
      setLogs(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, [channelFilter, statusFilter, triggerFilter]);

  useEffect(() => { void fetchLogs(); }, [fetchLogs]);

  const summary = {
    total: logs.length,
    success: logs.filter(l => l.status === 'success').length,
    failed: logs.filter(l => l.status === 'failed').length,
    skipped: logs.filter(l => l.status === 'skipped').length,
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">세시간전 습관챌린지</p>
            <h1 className="text-2xl font-bold text-[#1a1a2e]">발송 로그</h1>
            <p className="text-sm text-gray-400 mt-1">알림톡 및 이메일 발송 이력을 확인합니다.</p>
          </div>
          <button
            onClick={() => void fetchLogs()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm hover:border-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            새로고침
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: '전체', value: summary.total, color: 'text-[#1a1a2e]', dot: 'bg-gray-300' },
            { label: '성공', value: summary.success, color: 'text-green-600', dot: 'bg-green-500' },
            { label: '실패', value: summary.failed, color: 'text-[#FF7789]', dot: 'bg-[#FF7789]' },
            { label: '건너뜀', value: summary.skipped, color: 'text-gray-500', dot: 'bg-gray-400' },
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
            <select
              value={channelFilter}
              onChange={e => setChannelFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-600"
            >
              <option value="">전체 채널</option>
              <option value="alimtalk">알림톡</option>
              <option value="email">이메일</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-600"
            >
              <option value="">전체 상태</option>
              <option value="success">성공</option>
              <option value="failed">실패</option>
              <option value="skipped">건너뜀</option>
            </select>
            <select
              value={triggerFilter}
              onChange={e => setTriggerFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#28B8D1] bg-white text-gray-600"
            >
              <option value="">전체 트리거</option>
              <option value="application_created">신청 완료</option>
              <option value="payment_marked_paid">입금완료 변경</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-7 h-7 border-2 border-[#28B8D1] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-[#FF7789] text-sm">{error}</p>
              <button onClick={() => void fetchLogs()} className="text-sm text-[#28B8D1] underline">다시 시도</button>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <p className="text-gray-300 text-sm">발송 로그가 없습니다.</p>
              <p className="text-gray-200 text-xs">신청 완료 또는 입금완료 상태 변경 시 로그가 기록됩니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    {['발송일시', '채널', '트리거', '템플릿명', 'AID', '이름', '전화번호', '이메일', '상태', '에러'].map(col => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-400 tabular-nums">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${CHANNEL_BADGE[log.channel] ?? 'bg-gray-100 text-gray-600'}`}>
                          {CHANNEL_LABELS[log.channel] ?? log.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {TRIGGER_LABELS[log.trigger_type] ?? log.trigger_type}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 max-w-[160px]">
                        <div className="truncate" title={log.template_name}>{log.template_name}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {log.aid ?? <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        {log.recipient_name ?? <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {log.recipient_phone ?? <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px]">
                        <div className="truncate" title={log.recipient_email ?? ''}>
                          {log.recipient_email ?? <span className="text-gray-300">-</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[log.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'success' ? 'bg-green-500' : log.status === 'failed' ? 'bg-[#FF7789]' : 'bg-gray-400'}`} />
                          {STATUS_LABELS[log.status] ?? log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#FF7789] max-w-[200px]">
                        {log.error_message ? (
                          <div className="truncate" title={log.error_message}>{log.error_message}</div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && logs.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-50">
              <p className="text-xs text-gray-400">{logs.length}개 표시 중 (최신 100건)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
