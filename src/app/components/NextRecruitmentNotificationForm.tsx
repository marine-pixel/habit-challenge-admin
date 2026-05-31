'use client';

import { useState } from 'react';

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#28B8D1]/30 focus:border-[#28B8D1] transition-all text-sm text-[#1a1a2e] placeholder:text-gray-400';

export default function NextRecruitmentNotificationForm() {
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const digits = phone.replace(/\D/g, '');
    if (!digits) {
      setErrorMessage('휴대폰 번호를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/next-recruitment-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits }),
      });

      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        setErrorMessage(data.error ?? '오류가 발생했습니다. 다시 시도해주세요.');
        return;
      }

      setSubmitSuccess(true);
    } catch {
      setErrorMessage('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="apply" className="py-20 sm:py-24 bg-[#F2F2F7]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-flex items-center bg-[#FF7789]/10 text-[#FF7789] text-xs font-bold px-4 py-1.5 rounded-full mb-5 tracking-wider uppercase">
            다음 모집 알림
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] mb-4">
            다음 챌린지 알림 신청하기
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            현재 모집이 종료되었습니다.<br />
            다음 챌린지 모집이 시작되면 문자 메세지로 미리 알려드립니다.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          {submitSuccess ? (
            <div className="py-10 text-center space-y-3">
              <div className="text-4xl">🔔</div>
              <p className="text-lg font-bold text-[#1a1a2e]">알림 신청이 완료되었습니다.</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                다음 챌린지 모집이 시작되면 문자 메세지로 알려드릴게요.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#1a1a2e] mb-2 tracking-wide uppercase">
                  휴대폰 번호 <span className="text-[#FF7789]">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="알림을 받을 휴대폰 번호"
                  className={inputClass}
                  required
                />
              </div>

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#FF7789] text-white py-4 rounded-xl font-bold text-base hover:bg-[#ff5f72] active:scale-[0.99] transition-all duration-200 shadow-lg shadow-[#FF7789]/25 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '처리 중...' : '다음 모집 알림 신청하기 →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
