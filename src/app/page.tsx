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
    { icon: '⏰', label: '모집 마감', value: '2026.05.31(일) 23:59' },
    { icon: '📅', label: '진행 기간', value: '2026.06.01 ~ 06.21' },
    { icon: '🗓', label: '기간', value: '총 3주' },
    { icon: '✍️', label: '대상', value: '세시간전 크리에이터' },
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
            <SectionBadge>✦ 세시간전 크리에이터를 위한 3주 글쓰기 루틴</SectionBadge>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-[#1a1a2e] leading-[1.15] mb-6 tracking-tight">
              혼자 하면 끊기는<br />글쓰기,{' '}
              <span className="text-[#28B8D1]">3주만<br />같이</span> 해요
            </h1>

            <p className="text-gray-500 text-base sm:text-lg leading-relaxed mb-8 max-w-lg">
              뭐 쓰지? 고민은 줄이고, 수익화까지 이어가는 글쓰기 습관을 만들어보세요.
              습관챌린지는 매주 콘텐츠를 발행하고 제출하며, 피드백과 리워드로
              완주를 돕는 <strong className="text-[#1a1a2e] font-semibold">3주 프로그램</strong>입니다.
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
                지금 신청하기 →
              </a>
              <a
                href="#how"
                className="inline-flex items-center justify-center border-2 border-gray-200 text-gray-500 px-8 py-4 rounded-full font-semibold text-base hover:border-[#28B8D1] hover:text-[#28B8D1] transition-all duration-200"
              >
                진행 방식 보기
              </a>
            </div>
          </div>

          {/* Right: Info Card */}
          <div className="flex justify-center lg:justify-end">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 w-full max-w-sm">
              <div className="flex items-center justify-between mb-6">
                <p className="font-bold text-[#1a1a2e] text-sm">3주 습관챌린지</p>
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

              <div className="bg-[#28B8D1]/6 rounded-xl p-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-[#28B8D1] rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1a1a2e]">완주 시 참가비 100% 환급</p>
                  <p className="text-xs text-gray-400">주간 리워드 및 추가 혜택 제공</p>
                </div>
              </div>

              <div className="mt-4">
                <a
                  href="#apply"
                  className="block w-full text-center bg-[#FF7789] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#ff5f72] transition-colors shadow-md shadow-[#FF7789]/20"
                >
                  지금 신청하기
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
      title: '수익화가 막막한 분',
      desc: '수익화가 막막해서 뭐부터 해야 할지 모르겠는 분. 어디서부터 시작해야 할지 방향을 잡아드립니다.',
    },
    {
      num: '02',
      title: '방향이 헷갈리는 분',
      desc: '수익화 글을 써봤는데 이게 맞는지 헷갈리는 분. 피드백을 통해 내 글의 방향을 빠르게 확인할 수 있어요.',
    },
    {
      num: '03',
      title: '혼자서는 꾸준히 안 되는 분',
      desc: '혼자서는 꾸준히가 안 되는 분. 주차별 목표와 단톡방이 완주를 도와드립니다.',
    },
  ];

  return (
    <section id="target" className="py-20 sm:py-24 bg-[#F2F2F7]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <SectionBadge>추천 대상</SectionBadge>
          <SectionTitle>아래 중 하나라도 해당되면{'\n'}잘 맞아요</SectionTitle>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {targets.map((t) => (
            <div
              key={t.num}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 hover:shadow-md transition-shadow duration-200"
            >
              <div className="w-12 h-12 rounded-full bg-[#28B8D1]/10 flex items-center justify-center mb-5">
                <span className="text-[#28B8D1] text-sm font-bold">{t.num}</span>
              </div>
              <h3 className="font-bold text-[#1a1a2e] text-lg mb-3">{t.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 성과/변화 ─────────────────────────────────────────────────────
function ResultsSection() {
  const results = [
    {
      icon: '🏆',
      title: '첫 판매 경험',
      desc: '초보 참여자도 제휴링크를 넣은 글을 통해 첫 판매를 경험했어요. 처음이라도 자료와 피드백으로 충분히 시작할 수 있어요.',
    },
    {
      icon: '📈',
      title: '꾸준한 발행 루틴',
      desc: '주차별 목표가 있으니 혼자 할 때보다 발행을 미루지 않게 돼요. 3주 동안 쌓인 루틴이 그 이후에도 이어집니다.',
    },
    {
      icon: '🧭',
      title: '블로그 성장 방향',
      desc: '피드백과 자료를 통해 어떤 글을 늘려야 할지 방향을 잡을 수 있어요. 막막함 대신 다음 액션이 생깁니다.',
    },
  ];

  return (
    <section className="py-20 sm:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <SectionBadge>참여 후 변화</SectionBadge>
          <SectionTitle>참여하면 뭐가 달라지나요?</SectionTitle>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto text-sm leading-relaxed">
            습관챌린지는 거창한 목표보다, 매주 제출하는 작은 실행을 통해
            수익화 글쓰기 루틴을 만드는 데 집중합니다.
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

// ─── 후기 ──────────────────────────────────────────────────────────
function ReviewsSection() {
  const reviews = [
    {
      text: '꾸준히 쓰는 것만으로도 블로그 일방문자가 늘었어요.',
      role: '3기 참여자',
      initial: 'K',
    },
    {
      text: '네이버 변화로 불안했는데 비슷한 사람들끼리 이야기하니 좋았어요. 어떤 방향으로 운영해야 할지도 알게 됐고요.',
      role: '4기 참여자',
      initial: 'L',
    },
    {
      text: '챌린지 참여 첫 달만에 판매가 발생했어요! 어떻게 쓰는지 알고 쓰는 게 확실히 효과가 있는 것 같아요.',
      role: '2기 참여자',
      initial: 'P',
    },
    {
      text: '매주 1회 제휴링크 외에는 자유 주제로 쓸 수 있으니까 마음이 편해요. 체험단/일상도 쓰면서 수익화 글을 점점 늘려가는 게 목표예요.',
      role: '5기 참여자',
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
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <svg key={j} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-[#1a1a2e] text-sm leading-relaxed mb-5 font-medium">
                &ldquo;{r.text}&rdquo;
              </p>
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-full ${dotColors[i]} flex items-center justify-center text-white text-xs font-bold`}
                >
                  {r.initial}
                </div>
                <p className="text-xs text-gray-400 font-medium">{r.role}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <a
            href="#apply"
            className="inline-flex items-center justify-center bg-[#FF7789] text-white px-10 py-4 rounded-full font-bold text-base hover:bg-[#ff5f72] transition-all duration-200 shadow-lg shadow-[#FF7789]/25"
          >
            나도 3주 챌린지 참여하기 →
          </a>
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
      title: '전용 단톡방 운영',
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
      title: '챌린지 전용 자료 & 강의',
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
              <div className="w-12 h-12 rounded-xl bg-[#28B8D1]/15 text-[#28B8D1] flex items-center justify-center mb-5">
                {b.icon}
              </div>
              <h3 className="font-bold text-[#1a1a2e] text-base mb-4">{b.title}</h3>
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

        {/* Reward highlight box */}
        <div className="bg-gradient-to-br from-[#FF7789]/10 to-[#FF7789]/5 border border-[#FF7789]/20 rounded-2xl p-7 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex-1">
              <span className="inline-flex bg-[#FF7789] text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
                🎁 리워드
              </span>
              <h3 className="font-bold text-[#1a1a2e] text-xl mb-2">완주하면 이렇게 돌려드립니다</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                끝까지 함께한 분들께 확실한 보상을 드립니다. 완주 조건은 복잡하지 않아요.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:items-end min-w-fit">
              {[
                { label: '참가비', value: '100% 환급' },
                { label: '주간 리워드', value: '매주 지급' },
                { label: '추가 리워드', value: '별도 제공' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 shadow-sm">
                  <span className="text-xs text-gray-400 font-medium">{item.label}</span>
                  <span className="text-sm font-bold text-[#FF7789]">{item.value}</span>
                </div>
              ))}
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
    { num: '1', title: '블로그 글 발행', desc: '내 블로그에 글을 작성하고 발행합니다.' },
    { num: '2', title: '전용 시스템에 제출', desc: '세시간전 전용 시스템에 발행 링크를 제출합니다.' },
    { num: '3', title: '주 1회 수익화 콘텐츠 작성', desc: '제휴링크가 포함된 수익화 콘텐츠를 주 1회 작성합니다.' },
    { num: '4', title: '나머지 주제는 자유', desc: '체험단, 일상, 정보성 글 등 나머지는 자유롭게 운영합니다.' },
  ];

  return (
    <section id="how" className="py-20 sm:py-24 bg-[#F2F2F7]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <SectionBadge>진행 방식</SectionBadge>
          <SectionTitle>3주 동안 할 일은{'\n'}단순해요</SectionTitle>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {steps.map((s, i) => (
            <div key={i} className="relative">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow duration-200 h-full">
                <div className="w-10 h-10 rounded-full bg-[#28B8D1] text-white flex items-center justify-center font-bold text-sm mb-5">
                  {s.num}
                </div>
                <h3 className="font-bold text-[#1a1a2e] text-sm mb-2">{s.title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{s.desc}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-2 -translate-y-1/2 z-10">
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-[#28B8D1]/20 p-6 flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-[#28B8D1]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-[#28B8D1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1a1a2e] mb-1">이것만 기억하세요</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              주 1회는 제휴링크가 포함된 수익화 콘텐츠가 필요해요. 그 외에는 체험단, 일상, 정보성 글 등{' '}
              <strong className="text-[#1a1a2e]">자유롭게 작성</strong>할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 성공 기준 ─────────────────────────────────────────────────────
function SuccessCriteriaSection() {
  return (
    <section className="py-20 sm:py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <SectionBadge>성공 기준</SectionBadge>
        <SectionTitle>성공 기준은 복잡하지 않아요</SectionTitle>
        <p className="text-gray-500 mt-5 text-sm leading-relaxed max-w-lg mx-auto">
          주차 기준 또는 총량 기준 중 하나만 충족하면 성공으로 인정됩니다.
          완주 조건이 너무 엄격하면 중간에 포기하게 되니까요.
        </p>

        <div className="mt-10 bg-[#F2F2F7] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row gap-5 items-center justify-center">
          {[
            { label: '주차 기준', desc: '매주 최소 목표 달성' },
            { label: 'OR', isOr: true },
            { label: '총량 기준', desc: '3주 누적 달성 기준 충족' },
          ].map((item, i) =>
            'isOr' in item ? (
              <div key={i} className="font-bold text-gray-300 text-lg">OR</div>
            ) : (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-100 px-7 py-5 shadow-sm flex-1 max-w-[180px]"
              >
                <p className="font-bold text-[#28B8D1] text-sm mb-1">{item.label}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
            )
          )}
        </div>

        <p className="text-xs text-gray-400 mt-5">
          자세한 규칙은{' '}
          <a href="#faq" className="text-[#28B8D1] underline underline-offset-2">
            FAQ
          </a>
          에서 확인하실 수 있습니다.
        </p>
      </div>
    </section>
  );
}

// ─── 모집 일정 ─────────────────────────────────────────────────────
function ScheduleSection() {
  const scheduleItems = [
    { label: '모집 마감', value: '2026.05.31(일) 23:59', highlight: true },
    { label: '진행 기간', value: '2026.06.01 ~ 06.21' },
    { label: '진행 기간', value: '총 3주' },
    { label: '확정 기준', value: '신청폼 제출 + 참가비 입금 완료 시 확정' },
  ];

  return (
    <section id="schedule" className="py-20 sm:py-24 bg-[#F2F2F7]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <SectionBadge>일정</SectionBadge>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <SectionTitle>모집과 진행 일정</SectionTitle>
            <span className="bg-[#FF7789] text-white text-xs font-bold px-3 py-1 rounded-full">
              추가 모집 없음
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {scheduleItems.map((item, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-6 sm:px-8 py-5 ${
                i < scheduleItems.length - 1 ? 'border-b border-gray-50' : ''
              } ${item.highlight ? 'bg-[#FF7789]/4' : ''}`}
            >
              <span className="text-sm text-gray-400 font-medium">{item.label}</span>
              <span
                className={`text-sm font-bold text-right ${
                  item.highlight ? 'text-[#FF7789]' : 'text-[#1a1a2e]'
                }`}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          신청 후 입금 안내 메일을 발송해 드립니다. 입금 완료 시 최종 확정됩니다.
        </p>
      </div>
    </section>
  );
}

// ─── 하단 CTA ──────────────────────────────────────────────────────
function FooterCTASection() {
  return (
    <section className="py-20 sm:py-28 bg-[#1a1a2e] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#28B8D1]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#FF7789]/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-flex items-center bg-white/10 text-white/70 text-xs font-semibold px-4 py-1.5 rounded-full mb-7 tracking-wider">
          ✦ 마감이 얼마 남지 않았어요
        </span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
          이번 달, 글쓰기 루틴을<br />함께 만들어볼까요?
        </h2>
        <p className="text-white/60 text-base leading-relaxed mb-10">
          마감 전 신청하고 3주 동안 함께 완주해요.
        </p>
        <a
          href="#apply"
          className="inline-flex items-center justify-center bg-[#FF7789] text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-[#ff5f72] transition-all duration-200 shadow-2xl shadow-[#FF7789]/30"
        >
          마감 전 신청하기 →
        </a>
        <p className="text-white/30 text-xs mt-6">
          2026.05.31(일) 23:59 마감 · 추가 모집 없음
        </p>
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
        <ReviewsSection />
        <BenefitsSection />
        <HowToSection />
        <SuccessCriteriaSection />
        <ScheduleSection />
        <ApplicationForm />
        <FAQSection />
        <FooterCTASection />
      </main>
      <Footer />
    </>
  );
}
