'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: '신청자 관리', href: '/admin/applicants' },
  { label: '제출 현황', href: '/admin/submissions' },
  { label: '메시지 관리', href: '/admin/messages' },
  { label: '발송 로그', href: '/admin/message-logs' },
] as const;

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
        {/* Desktop: single row | Mobile: two rows */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-5 sm:h-14">

          {/* Brand */}
          <div className="flex items-center gap-1.5 py-3 sm:py-0 flex-shrink-0">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#28B8D1] to-[#FF7789] flex items-center justify-center">
              <span className="text-white text-[10px] font-black leading-none">A</span>
            </div>
            <span className="text-sm font-bold text-[#1a1a2e]">습관챌린지 어드민</span>
          </div>

          {/* Divider — desktop only */}
          <span className="hidden sm:block w-px h-5 bg-gray-200 flex-shrink-0" />

          {/* Nav items */}
          <div
            className="flex items-center gap-0.5 overflow-x-auto pb-2.5 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {NAV_ITEMS.map(({ label, href }) => {
              const isActive =
                pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    'flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                    isActive
                      ? 'bg-[#28B8D1]/10 text-[#28B8D1]'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
                  ].join(' ')}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
