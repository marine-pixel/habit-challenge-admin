import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "세시간전 습관챌린지 | 3주 글쓰기 루틴 모집",
  description:
    "혼자 하면 끊기는 글쓰기, 3주만 같이 해요. 세시간전 크리에이터를 위한 수익화 글쓰기 루틴 만들기 프로그램입니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
