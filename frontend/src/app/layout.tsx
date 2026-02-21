import type { Metadata } from "next";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const notoThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MangaLabTH — อ่านมังงะออนไลน์",
  description: "แพลตฟอร์มอ่านมังงะออนไลน์ระดับพรีเมียม สนุกกับการอ่านมังงะแปลไทย ภาพคมชัด อัปเดตตอนใหม่ล่าสุด",
  keywords: ["มังงะ", "อ่านมังงะ", "มังงะแปลไทย", "manga", "MangaLabTH", "เว็บอ่านมังงะ"],
  openGraph: {
    title: "MangaLabTH — อ่านมังงะออนไลน์",
    description: "แพลตฟอร์มอ่านมังงะออนไลน์ระดับพรีเมียม สนุกกับการอ่านมังงะแปลไทย ภาพคมชัด",
    siteName: "MangaLabTH",
    locale: "th_TH",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="th">
        <body
          className={`${inter.variable} ${notoThai.variable} font-sans antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

