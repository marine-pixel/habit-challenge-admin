'use client';

import { useState } from 'react';

const classOptions = [
  { label: '베이직반 : 매주 3건 작성 (수익화 콘텐츠 1건 포함)', value: '베이직반' },
  { label: '부스터반 : 매주 5건 작성 (수익화 콘텐츠 1건 포함)', value: '부스터반' },
];

interface FormState {
  nickname: string;
  aid: string;
  email: string;
  phone: string;
  blogUrl: string;
  classType: string;
  agreed: boolean;
  isOverseas: boolean;
}

const initialForm: FormState = {
  nickname: '',
  aid: '',
  email: '',
  phone: '',
  blogUrl: '',
  classType: '',
  agreed: false,
  isOverseas: false,
};

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#28B8D1]/30 focus:border-[#28B8D1] transition-all text-sm text-[#1a1a2e] placeholder:text-gray-400';

export default function ApplicationForm() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    setForm((prev) => ({
      ...prev,
      [target.name]: target.type === 'checkbox' ? target.checked : target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!/^\d{6}$/.test(form.aid)) {
      setErrorMessage('AID는 숫자 6자리를 입력해주세요.');
      return;
    }

    if (!form.classType) {
      setErrorMessage('참여 반을 선택해주세요.');
      return;
    }

    if (!form.agreed) {
      setErrorMessage('개인정보 수집 및 이용에 동의해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aid: form.aid,
          nickname: form.nickname,
          email: form.email,
          phone: form.phone,
          blog_url: form.blogUrl,
          class_type: form.classType,
          goal: null,
          privacy_agreed: form.agreed,
          is_overseas_resident: form.isOverseas,
        }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setErrorMessage(data.error ?? '신청 중 오류가 발생했습니다. 다시 시도해주세요.');
        return;
      }

      setForm(initialForm);
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
            신청하기
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] mb-4">
            습관챌린지 신청하기
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            신청폼 제출과 참가비 입금이 완료되면 참여가 확정됩니다.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          {submitSuccess ? (
            <div className="py-10 text-center space-y-3">
              <div className="text-4xl">🎉</div>
              <p className="text-lg font-bold text-[#1a1a2e]">신청이 완료되었습니다!</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                참가비 1만원 입금 안내 메세지가 카카오톡으로 발송됩니다.<br />
                참가비 입금까지 완료되면 참여가 확정됩니다.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-[#1a1a2e] mb-2 tracking-wide uppercase">
                    이름 <span className="text-[#FF7789]">*</span>
                  </label>
                  <input
                    type="text"
                    name="nickname"
                    value={form.nickname}
                    onChange={handleChange}
                    placeholder="이름을 입력해주세요"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1a1a2e] mb-2 tracking-wide uppercase">
                    세시간전 AID <span className="text-[#FF7789]">*</span>
                  </label>
                  <input
                    type="text"
                    name="aid"
                    value={form.aid}
                    onChange={handleChange}
                    placeholder="숫자 6자리"
                    maxLength={6}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-[#1a1a2e] mb-2 tracking-wide uppercase">
                    이메일 <span className="text-[#FF7789]">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="제출 시스템 접속에 필요한 이메일 주소"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1a1a2e] mb-2 tracking-wide uppercase">
                    휴대폰 번호 <span className="text-[#FF7789]">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="입금 정보를 전달받을 휴대폰 번호"
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1a1a2e] mb-2 tracking-wide uppercase">
                  블로그 URL <span className="text-[#FF7789]">*</span>
                </label>
                <input
                  type="url"
                  name="blogUrl"
                  value={form.blogUrl}
                  onChange={handleChange}
                  placeholder="https://blog.naver.com/..."
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1a1a2e] mb-1 tracking-wide uppercase">
                  참여반 선택 <span className="text-[#FF7789]">*</span>
                </label>
                <p className="text-xs text-gray-400 mb-2 leading-relaxed">
                  내가 매주 쓸 수 있는 수량을 기준으로 선택해 주세요(제공자료, 혜택 모두 동일)
                </p>
                <div className="relative">
                  <select
                    name="classType"
                    value={form.classType}
                    onChange={handleChange}
                    className={`${inputClass} appearance-none cursor-pointer`}
                    required
                  >
                    <option value="">반을 선택해주세요</option>
                    {classOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 해외 체류/거주자 체크박스 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isOverseas"
                    checked={form.isOverseas}
                    onChange={handleChange}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-[#28B8D1] cursor-pointer flex-shrink-0"
                  />
                  <span className="text-sm text-gray-600 leading-relaxed">
                    <span className="font-semibold text-[#1a1a2e]">해외 체류, 거주자인 경우 체크해주세요.</span>
                    <br />
                    <span className="text-xs text-gray-400">
                      안내 메세지가 모두 이메일로도 추가 발송됩니다.
                    </span>
                  </span>
                </label>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="agreed"
                    checked={form.agreed}
                    onChange={handleChange}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-[#28B8D1] cursor-pointer flex-shrink-0"
                    required
                  />
                  <span className="text-sm text-gray-600 leading-relaxed">
                    <span className="font-semibold text-[#1a1a2e]">개인정보 수집 및 이용에 동의합니다.</span>
                    <br />
                    <span className="text-xs text-gray-400">
                      이름, 이메일, 연락처는 챌린지 운영 목적으로만 사용되며, 종료 후 파기됩니다.
                    </span>
                  </span>
                </label>
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
                {isSubmitting ? '제출 중...' : '신청서 제출하기 →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
