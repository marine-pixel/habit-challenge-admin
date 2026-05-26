import Navbar from './components/Navbar';
import FAQSection from './components/FAQSection';
import ApplicationForm from './components/ApplicationForm';

// ─── Shared helpers ────────────────────────────────────────────────
function SectionBadge({
  children,
  color = 'primary',
}: {
  children: React.ReactNode;
  color?: 'primary' | 'accent';
}) {
  const styles =
    color === 'accent'
      ? 'bg-[#FF7789]/10 text-[#FF7789]'
      : 'bg-[#28B8D1]/10 text-[#28B8D1]';
  return (
    <span
      className={`inline-flex items-center ${styles} text-xs font-bold px-4 py-1.5 rounded-full mb-5 tracking-wider uppercase`}
    >
      {children}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] leading-tight">
      {children}
    </h2>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────
function HeroSection() {
  const infoItems = [
    { icon: '⏰', label: '모집 마감', value: '2026.05.31(일) 23:59까지 (추가모집 없음)' },
    { icon: '📅', label: '진행 기간', value: '2026.06.01~06.21' },
    { icon: '🗓', label: '기간', value: '총 3주' },
    { icon: '💰', label: '참가비', value: '1만원' },
    { icon: '🎁', label: '완주 혜택', value: '참가비 100% 환급' },
  ];

  const avatarColors = ['bg-[#28B8D1]', 'bg-[#FF7789]', 'bg-purple-400', 'bg-amber-400'];
  const avatarLabels = ['김', '이', '박', '최'];

  return (
    <section className="relative min-h-screen bg-white flex items-center overflow-hidden pt-16">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#28B8D1]/6 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#FF7789]/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div>
            <SectionBadge>✦ 수익화까지 이어지는 3주 프로그램</SectionBadge>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-[#1a1a2e] leading-[1.15] mb-6 tracking-tight">
              꾸준히 글을 쓰면<br />
              수익화 기회도 늘어요
            </h1>

            <p className="text-gray-500 text-base sm:text-lg leading-relaxed mb-8 max-w-lg">
              3주간 꾸준히 쓰며 루틴을 만들고 수익화 글쓰기 방법도 함께 익혀요.<br />
              수익화 + 블로그 성장, 둘 다 가져가는 3주 챌린지입니다.
            </p>

            {/* Social proof */}
            <div className="flex items-center gap-3 mb-8">
              <div className="flex -space-x-2">
                {avatarLabels.map((label, i) => (
                  <div
                    key={i}
                    className={`w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold ${avatarColors[i]}`}
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">
                  누적 참여자{' '}
                  <span className="text-[#28B8D1] font-bold">1,500명+</span>
                </p>
                <p className="text-xs text-gray-400">이미 많은 분들이 함께하고 있어요</p>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="#apply"
                className="inline-flex items-center justify-center bg-[#FF7789] text-white px-8 py-4 rounded-full font-bold text-base hover:bg-[#ff5f72] transition-all duration-200 shadow-lg shadow-[#FF7789]/25"
              >
                신청하기 →
              </a>
              <a
                href="#benefits"
                className="inline-flex items-center justify-center border-2 border-gray-200 text-gray-500 px-8 py-4 rounded-full font-semibold text-base hover:border-[#28B8D1] hover:text-[#28B8D1] transition-all duration-200"
              >
                참여 혜택 보기
              </a>
            </div>
          </div>

          {/* Right: Info Card */}
          <div className="flex justify-center lg:justify-end">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 w-full max-w-sm">
              <div className="flex items-center justify-between mb-6">
                <p className="font-bold text-[#1a1a2e] text-sm">6월 습관챌린지 일정</p>
                <span className="bg-[#FF7789]/10 text-[#FF7789] text-xs font-bold px-3 py-1 rounded-full">
                  모집중
                </span>
              </div>

              <div className="space-y-1 mb-6">
                {infoItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-xl w-7 text-center">{item.icon}</span>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">{item.label}</p>
                      <p className="text-sm font-semibold text-[#1a1a2e]">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <a
                  href="#apply"
                  className="block w-full text-center bg-[#FF7789] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#ff5f72] transition-colors shadow-md shadow-[#FF7789]/20"
                >
                  신청하기
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 추천 대상 ─────────────────────────────────────────────────────
function TargetSection() {
  const targets = [
    {
      num: '01',
      title: '블로그 수익화 시작이 막막한 분들',
      desc: '어떤 글을, 어떻게 써야지 수익화를 할 수 있는지 알고 싶다면 초보자 자료부터 차근차근 따라해 보세요.',
    },
    {
      num: '02',
      title: '1일 1포 하는데도 수익이 계속 0원인 분',
      desc: '콘텐츠 피드백을 통해 어떻게 써야 사람들이 클릭하고 구매하는지 방향을 다시 잡아드립니다.',
    },
    {
      num: '03',
      title: '3일 쓰고 또 포기한 분',
      desc: '수익화 의지는 있는데 혼자라 흐지부지된다면 같은 고민하는 블로거들과 함께 달려보아요.',
    },
  ];

  return (
    <section id="target" className="py-20 sm:py-24 bg-[#F2F2F7]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <SectionBadge>추천 대상</SectionBadge>
          <SectionTitle>아래 중 하나라도 해당된다면, 이 챌린지 잘 맞아요.</SectionTitle>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {targets.map((t) => (
            <div
              key={t.num}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[#28B8D1] text-sm font-bold flex-shrink-0">{t.num}</span>
                <h3 className="font-bold text-[#1a1a2e] text-lg leading-snug">{t.title}</h3>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 참여 후 변화 ──────────────────────────────────────────────────
function ResultsSection() {
  const results = [
    {
      icon: '🏆',
      title: '첫 판매 경험',
      desc: '챌린지 첫 참여자의 67%가 수익화를 경험했어요. 처음이라도 자료와 피드백으로 충분히 시작할 수 있어요.',
    },
    {
      icon: '📈',
      title: '꾸준한 발행 루틴',
      desc: '주차별 목표가 있으니 혼자 할 때보다 발행을 미루지 않게 돼요. 3주 동안 억지로라도 쓰다보면 어느순간 습관이 되어 있어요.',
    },
    {
      icon: '🧭',
      title: '수익화 블로그로 성장',
      desc: '참여자 82%*는 판매금액이 유지되거나 증가했어요. 피드백 강의와 자료가 블로그 운영의 나침반이 됩니다. (*스타/엘리트 등급 제외)',
    },
  ];

  return (
    <section className="py-20 sm:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <SectionBadge>참여 후 변화</SectionBadge>
          <SectionTitle>3주 뒤 이렇게 달라져 있을거예요.</SectionTitle>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto text-sm leading-relaxed">
            글이 꾸준히 쌓이고, 그 글이 수익으로 연결되는 기회가 늘어납니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {results.map((r, i) => (
            <div
              key={i}
              className="group bg-[#F2F2F7] rounded-2xl p-7 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100 transition-all duration-300"
            >
              <div className="text-3xl mb-5">{r.icon}</div>
              <div className="w-6 h-0.5 bg-[#28B8D1] mb-4 rounded-full group-hover:w-12 transition-all duration-300" />
              <h3 className="font-bold text-[#1a1a2e] text-lg mb-3">{r.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 혜택 ──────────────────────────────────────────────────────────
function BenefitsSection() {
  const benefits = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      title: '전용 단톡방에서 질문 가능',
      points: ['글 쓰다가 생기는 고민을 그때그때 해결', '혼자 고민하느라 시간 낭비하지 않기'],
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      title: '피드백 게시판 운영',
      points: ['내 콘텐츠가 잘 가고 있는지 체크', '막히는 지점과 개선 방향을 빠르게 확인'],
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      title: '챌린지 전용 자료 & 강의 제공',
      points: ['수익화 글쓰기 기초부터 적용 팁까지', '초보도 따라오기 쉬운 구성'],
    },
  ];

  return (
    <section id="benefits" className="py-20 sm:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <SectionBadge>혜택</SectionBadge>
          <SectionTitle>혼자 고민하지 않게,{'\n'}이렇게 도와드려요</SectionTitle>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {benefits.map((b, i) => (
            <div
              key={i}
              className="bg-[#F2F2F7] rounded-2xl p-7 hover:bg-white hover:shadow-md hover:border hover:border-gray-100 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-[#28B8D1]/15 text-[#28B8D1] flex items-center justify-center mb-4 [&_svg]:w-5 [&_svg]:h-5">
                {b.icon}
              </div>
              <h3 className="font-bold text-[#1a1a2e] text-xl mb-4">{b.title}</h3>
              <ul className="space-y-2">
                {b.points.map((pt, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-gray-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#28B8D1] mt-1.5 flex-shrink-0" />
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Reward cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex items-center gap-5 bg-[#FF7789]/8 border border-[#FF7789]/20 rounded-2xl px-7 py-6">
            <span className="text-3xl flex-shrink-0">🎁</span>
            <div>
              <p className="text-sm text-gray-400 font-medium mb-1">완주 혜택</p>
              <p className="text-lg font-bold text-[#FF7789]">참가비 100% 환급</p>
            </div>
          </div>
          <div className="flex items-center gap-5 bg-[#FF7789]/8 border border-[#FF7789]/20 rounded-2xl px-7 py-6">
            <span className="text-3xl flex-shrink-0">🏆</span>
            <div>
              <p className="text-sm text-gray-400 font-medium mb-1">주간 혜택</p>
              <p className="text-lg font-bold text-[#FF7789]">주간 리워드 매주 랜덤 지급</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 진행 방식 ─────────────────────────────────────────────────────
function HowToSection() {
  const steps = [
    {
      num: '1',
      title: '블로그 글 발행',
      desc: '내 블로그에 기존에 내가 쓰던 주제로 블로그 글을 작성하고 제출해 주세요.',
    },
    {
      num: '2',
      title: '주 1회 수익화 콘텐츠 작성',
      desc: '일주일에 딱 한 번, 수익화 글 하나만 쓰면 됩니다. 그 외에는 체험단, 일상, 정보성 글 등 자유롭게 작성할 수 있어요.',
    },
  ];

  return (
    <section id="how" className="py-20 sm:py-24 bg-[#F2F2F7]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <SectionBadge>진행 방식</SectionBadge>
          <SectionTitle>3주 동안 딱 이것만 하면 돼요.</SectionTitle>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {steps.map((s, i) => (
            <div key={i} className="relative">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow duration-200 h-full">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-[#28B8D1] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {s.num}
                  </div>
                  <h3 className="font-bold text-[#1a1a2e] text-base leading-snug">{s.title}</h3>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden sm:block absolute top-1/2 -right-2 -translate-y-1/2 z-10">
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 참여자 후기 ───────────────────────────────────────────────────
function ReviewsSection() {
  const reviews = [
    {
      text: '블로그를 시작하고 처음 참여했는데, 한 달 만에 일방문자 200명대를 꾸준히 유지하게 됐어요.',
      achievement: '블로그 시작 한달만에 일방문자 200대 유지',
      role: '4월 챌린지 첫 참여자',
      initial: 'K',
    },
    {
      text: '500대에서 1,000대로 박스권을 드디어 탈출했어요! 혼자였다면 이 루틴을 이어가지 못했을 것 같아요.',
      achievement: '일방문자 500대 → 1,000대로 박스권 탈출',
      role: '4회 연속 참여자',
      initial: 'L',
    },
    {
      text: '챌린지 첫 참여인데 2주차에 첫 판매가 발생했어요. 어떻게 쓰는지 알고 쓰는 게 확실히 다르더라고요.',
      achievement: '참여 2주차에 첫 판매 발생',
      role: '3월 챌린지 첫 참여자',
      initial: 'P',
    },
    {
      text: '매달 꾸준히 완주하면서 누적 3천만원 판매를 달성했어요. 챌린지 덕분에 멈추지 않을 수 있었어요.',
      achievement: '매달 완주 후 누적 3천만원 판매 발생',
      role: '6회 연속 참여자',
      initial: 'C',
    },
  ];

  const dotColors = ['bg-[#28B8D1]', 'bg-[#FF7789]', 'bg-purple-400', 'bg-amber-400'];

  return (
    <section id="reviews" className="py-20 sm:py-24 bg-[#F2F2F7]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <SectionBadge>참여자 후기</SectionBadge>
          <SectionTitle>혼자였다면 멈췄을 순간,{'\n'}함께라서 이어졌어요</SectionTitle>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-12">
          {reviews.map((r, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 hover:shadow-md transition-shadow duration-200"
            >
              <p className="text-[#1a1a2e] text-sm leading-relaxed mb-5 font-medium">
                &ldquo;{r.text}&rdquo;
              </p>
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-full ${dotColors[i]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                >
                  {r.initial}
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#1a1a2e]">{r.role}</p>
                  <p className="text-xs text-[#28B8D1] font-medium mt-0.5">{r.achievement}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center space-y-4">
          <a
            href="#apply"
            className="inline-flex items-center justify-center bg-[#FF7789] text-white px-10 py-4 rounded-full font-bold text-base hover:bg-[#ff5f72] transition-all duration-200 shadow-lg shadow-[#FF7789]/25"
          >
            6월 습관챌린지 참여하기 →
          </a>
          <p className="text-sm text-gray-400">
            참여자들이 자주 묻는 질문은 아래{' '}
            <a href="#faq" className="text-[#28B8D1] underline underline-offset-2 font-medium">
              FAQ
            </a>
            에서 확인하실 수 있습니다.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-[#111827] py-10 px-4">
      <div className="max-w-6xl mx-auto text-center">
        <p className="font-bold text-white/80 text-sm mb-1">세시간전 습관챌린지</p>
        <p className="text-white/30 text-xs">
          © 2026 세시간전. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

// ─── Page ──────────────────────────────────────────────────────────
export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <TargetSection />
        <ResultsSection />
        <BenefitsSection />
        <HowToSection />
        <ReviewsSection />
        <ApplicationForm />
        <FAQSection />
      </main>
      <Footer />
    </>
  );
}
