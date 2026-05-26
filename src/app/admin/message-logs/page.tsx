export default function MessageLogsPage() {
  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <p className="text-xs text-gray-400 mb-0.5">세시간전 습관챌린지</p>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">발송 로그</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FF7789]/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-[#FF7789]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[#1a1a2e] font-semibold text-sm">발송 로그 준비 중</p>
            <p className="text-gray-400 text-xs mt-1">이 기능은 곧 추가될 예정입니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
