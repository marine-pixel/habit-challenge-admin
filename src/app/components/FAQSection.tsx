'use client';

import { useState } from 'react';

interface FAQ {
  q: string;
  a: React.ReactNode;
}

const faqs: FAQ[] = [
  {
    q: '입금했는데 안내가 안 와요. 언제 확인되나요?',
    a: '입금 확인 안내는 영업일 기준으로 순차 발송됩니다. (주말/공휴일 제외)',
  },
  {
    q: '베이직반과 부스터반의 차이는 무엇인가요?',
    a: '차이는 \'매주 작성해야 하는 콘텐츠 수량(주 3회 vs 주 5회)\'입니다. 내가 매주 꾸준히 지킬 수 있는 목표를 선택하는 것이 중요합니다. 현재 내 상황에 맞는 반을 선택해 주세요. 이외에 강의, 혜택 모두 동일하게 제공됩니다.',
  },
  {
    q: '어떤 반을 선택해야 할지 도저히 모르겠어요.',
    a: (
      <>
        <p>혼자 고민하지 마세요! 아래 링크로 연락 주시면 현재 운영 중인 블로그 상태와 최근 콘텐츠를 살펴보고 가장 적합한 목표 코스를 추천해 드립니다. 만약 습관챌린지가 처음이라면 베이직반을 추천드려요.</p>
        <p className="mt-2">
          <a
            href="https://open.kakao.com/o/sBWsgujh"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#28B8D1] underline underline-offset-2 font-medium hover:text-[#1fa8bf] transition-colors"
          >
            문의하기
          </a>
        </p>
      </>
    ),
  },
  {
    q: '작성하는 콘텐츠 주제에 제한이 있나요?',
    a: '일상, 맛집, 리뷰, 정보성 글 등 어떤 주제든 자유롭게 작성하시면 됩니다! 단, 주 1회 수익화 콘텐츠는 \'세시간전 제휴 링크\'가 포함되어야 하며 반드시 해당 링크의 상품/서비스와 관련 있는 주제로 작성해 주셔야 인정됩니다.',
  },
  {
    q: '수익화 콘텐츠는 꼭 써야하나요?',
    a: '세시간전 제휴링크가 본문에 포함된 글을 의미합니다. 이번 챌린지의 핵심 목표 중 하나가 \'수익화 경험\'이기 때문에 선택하신 반과 상관없이 매주 최소 1개 이상은 필수로 발행해 주셔야 합니다. 더 많은 수익 기회를 원하신다면 수익화 콘텐츠 발행 비중을 늘리시는 것을 권장합니다.',
  },
  {
    q: '수익화 콘텐츠를 써본 적이 없어요. 따로 알려주시나요?',
    a: (
      <>
        <p>네, 처음이어도 괜찮아요! 수익화 콘텐츠 작성법과 예시가 정리된 자료를 따라가며 하나씩 적용하면 처음이셔도 어렵지 않게 시작할 수 있습니다. 진행 중 막히는 부분은 전용 질문방에서 언제든지 질문해 주세요.</p>
        <p className="mt-2">추가로 세시간전 제휴링크를 활용한 콘텐츠 작성이 처음이라면 베이직반을 추천드립니다. 베이직반은 수익화 콘텐츠가 처음이어도 부담 없이 시작할 수 있도록 구성했어요. 매주 콘텐츠 3회를 목표로 하며 많이 쓰기보다 &lsquo;수익화 글의 기본 구조&rsquo;를 익히는 데 집중할 수 있어요.</p>
      </>
    ),
  },
  {
    q: '콘텐츠 인증은 어떻게 하나요?',
    a: '습관챌린지 전용 단톡방에 공유해 드리는 \'제출 시스템\'에 본인이 작성한 포스팅 URL을 제출해 주시면 됩니다. 선택하신 목표에 맞춰 주 3회 또는 5회 이상 제출하시면 성공입니다.',
  },
  {
    q: '습관챌린지 성공 기준이 궁금해요.',
    a: (
      <>
        <p>주차별 목표 또는 전체 목표 중 운영 기준에 맞는 성공 조건을 충족하면 성공으로 인정됩니다.</p>
        <p className="mt-2">베이직반은 매주 3건, 부스터반은 매주 5건 작성을 기준으로 하며, 두 반 모두 주 1회 수익화 콘텐츠 1건이 포함되어야 합니다. 자세한 기준은 챌린지 시작 안내에서 다시 안내드립니다.</p>
      </>
    ),
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
