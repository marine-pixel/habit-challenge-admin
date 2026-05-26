export default function MessagesPage() {
  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <p className="text-xs text-gray-400 mb-0.5">세시간전 습관챌린지</p>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">메시지 관리</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#28B8D1]/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-[#28B8D1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[#1a1a2e] font-semibold text-sm">메시지 관리 준비 중</p>
            <p className="text-gray-400 text-xs mt-1">이 기능은 곧 추가될 예정입니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
