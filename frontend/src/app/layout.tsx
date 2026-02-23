import type { Metadata } from "next";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ThemeProvider } from "@/components/ThemeProvider";
import { DeviceDetector } from "@/components/DeviceDetector";
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: {
    template: "%s | MangaLabTH",
    default: "MangaLabTH — อ่านมังงะแปลไทยออนไลน์ฟรี อัปเดตตอนใหม่ภาพคมชัด",
  },
  description:
    "MangaLabTH ศูนย์รวมมังงะแปลไทย อ่านออนไลน์ฟรีทุกวัน ภาพคมชัด อัปเดตตอนใหม่ล่าสุด ทั้งแนวแอคชั่น โรแมนติก แฟนตาซี ซีรีส์เกาหลีและญี่ปุ่น",
  keywords: [
    "มังงะ", "อ่านมังงะ", "มังงะแปลไทย", "manga", "MangaLabTH",
    "เว็บอ่านมังงะ", "มังงะฮิต", "อ่านการ์ตูน", "อ่านมังงะฟรี",
    "มังงะเกาหลี", "มังงะญี่ปุ่น", "มังงะจีน",
  ],
  authors: [{ name: "MangaLabTH" }],
  openGraph: {
    title: "MangaLabTH — อ่านมังงะแปลไทยออนไลน์ฟรี",
    description:
      "MangaLabTH ศูนย์รวมมังงะแปลไทย อ่านออนไลน์ฟรีทุกวัน พร้อมรูปคมชัดสูง",
    siteName: "MangaLabTH",
    locale: "th_TH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MangaLabTH — อ่านมังงะออนไลน์",
    description:
      "แพลตฟอร์มอ่านมังงะออนไลน์ อัปเดตเร็ว ภาพคมชัดอ่านง่ายบนมือถือ",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#d4a843", // สีทองตามธีมเว็บ (--color-gold)
        },
      }}
    >
      <html lang="th">

        <body
          className={`${inter.variable} ${notoThai.variable} font-sans antialiased`}
        >
          <DeviceDetector />
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

