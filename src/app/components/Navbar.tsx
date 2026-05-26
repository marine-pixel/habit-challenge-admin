'use client';

import { useState, useEffect } from 'react';

const navLinks = [
  { href: '#target', label: '추천 대상' },
  { href: '#reviews', label: '후기' },
  { href: '#benefits', label: '혜택' },
  { href: '#how', label: '진행 방식' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100'
          : 'bg-white/80 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="#" className="font-bold text-lg text-[#1a1a2e] tracking-tight">
            세시간전{' '}
            <span className="text-[#28B8D1]">습관챌린지</span>
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-500">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="hover:text-[#28B8D1] transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#apply"
              className="bg-[#FF7789] text-white px-5 py-2.5 rounded-full font-semibold hover:bg-[#ff5f72] transition-all duration-200 shadow-sm shadow-[#FF7789]/20"
            >
              신청하기
            </a>
          </div>

          {/* Mobile */}
          <div className="md:hidden flex items-center gap-3">
            <a
              href="#apply"
              className="bg-[#FF7789] text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#ff5f72] transition-colors"
            >
              신청하기
            </a>
            <button
              onClick={() => setOpen(!open)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="메뉴 열기"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {open ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-4 border-t border-gray-100 mt-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block py-3 px-1 text-gray-600 hover:text-[#28B8D1] font-medium text-sm transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
