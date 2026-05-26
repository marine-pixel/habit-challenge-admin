'use client';

import { useState } from 'react';

const faqs = [
  {
    q: '세시간전 회원만 참여할 수 있나요?',
    a: '네, 세시간전 크리에이터를 대상으로 진행됩니다.',
  },
  {
    q: '블로그 초보도 참여할 수 있나요?',
    a: '가능합니다. 수익화 글쓰기 기초 자료와 피드백을 함께 제공합니다. 처음이라도 자료와 단톡방을 통해 충분히 따라오실 수 있어요.',
  },
  {
    q: '콘텐츠는 어디에 제출하나요?',
    a: '세시간전 전용 제출 시스템을 통해 제출합니다. 참가 확정 후 별도로 안내 드립니다.',
  },
  {
    q: '제휴링크는 꼭 넣어야 하나요?',
    a: '주 1회는 제휴링크가 포함된 수익화 콘텐츠 제출이 필요합니다. 그 외 나머지 발행은 체험단, 일상, 정보성 글 등 자유롭게 작성하실 수 있습니다.',
  },
  {
    q: '리워드는 어떻게 지급되나요?',
    a: '완주 조건 충족 후 안내된 방식에 따라 지급됩니다. 완주 시 참가비 100% 환급 및 주간 리워드가 제공됩니다.',
  },
  {
    q: '챌린지 성공 기준이 궁금해요.',
    a: '주차별 목표 또는 전체 목표 중 운영 기준에 맞는 성공 조건을 충족하면 성공으로 인정됩니다. 베이직반은 매주 3건, 부스터반은 매주 5건 작성을 기준으로 하며, 두 반 모두 주 1회 수익화 콘텐츠 1건이 포함되어야 합니다. 자세한 기준은 챌린지 시작 안내에서 다시 안내드립니다.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-20 sm:py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-flex items-center bg-[#28B8D1]/10 text-[#28B8D1] text-xs font-bold px-4 py-1.5 rounded-full mb-5 tracking-wider uppercase">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e]">
            자주 묻는 질문
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left"
              >
                <span className="font-semibold text-[#1a1a2e] text-sm sm:text-base pr-4">
                  {faq.q}
                </span>
                <span
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                    openIndex === i
                      ? 'bg-[#28B8D1] text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      openIndex === i ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </button>
              {openIndex === i && (
                <div className="px-6 pb-5 text-gray-500 text-sm leading-relaxed border-t border-gray-50 pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
