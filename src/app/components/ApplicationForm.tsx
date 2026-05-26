'use client';

import { useState } from 'react';

const goalOptions = [
  '수익화 글 꾸준히 발행하기',
  '첫 제휴 판매 경험하기',
  '블로그 방문자 늘리기',
  '글쓰기 루틴 만들기',
  '기타',
];

interface FormState {
  name: string;
  aid: string;
  email: string;
  phone: string;
  blogUrl: string;
  goal: string;
  agreed: boolean;
}

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#28B8D1]/30 focus:border-[#28B8D1] transition-all text-sm text-[#1a1a2e] placeholder:text-gray-400';

export default function ApplicationForm() {
  const [form, setForm] = useState<FormState>({
    name: '',
    aid: '',
    email: '',
    phone: '',
    blogUrl: '',
    goal: '',
    agreed: false,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    setForm((prev) => ({
      ...prev,
      [target.name]: target.type === 'checkbox' ? target.checked : target.value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('신청 기능은 다음 단계에서 연결됩니다.');
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
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#1a1a2e] mb-2 tracking-wide uppercase">
                  이름 / 닉네임 <span className="text-[#FF7789]">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="이름 또는 닉네임"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1a1a2e] mb-2 tracking-wide uppercase">
                  AID / 회원 ID <span className="text-[#FF7789]">*</span>
                </label>
                <input
                  type="text"
                  name="aid"
                  value={form.aid}
                  onChange={handleChange}
                  placeholder="세시간전 AID 또는 회원 ID"
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
                  placeholder="이메일 주소"
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
                  placeholder="010-0000-0000"
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
              <label className="block text-xs font-bold text-[#1a1a2e] mb-2 tracking-wide uppercase">
                참여 목표
              </label>
              <div className="relative">
                <select
                  name="goal"
                  value={form.goal}
                  onChange={handleChange}
                  className={`${inputClass} appearance-none cursor-pointer`}
                >
                  <option value="">목표를 선택해주세요</option>
                  {goalOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
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

            <button
              type="submit"
              className="w-full bg-[#FF7789] text-white py-4 rounded-xl font-bold text-base hover:bg-[#ff5f72] active:scale-[0.99] transition-all duration-200 shadow-lg shadow-[#FF7789]/25 mt-2"
            >
              신청서 제출하기 →
            </button>

            <p className="text-center text-xs text-gray-400">
              신청 후 참가비 입금 안내가 별도로 발송됩니다
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
