import type { Metadata } from "next";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { thTH } from "@clerk/localizations";
import { ThemeProvider } from "@/components/ThemeProvider";
import { DeviceDetector } from "@/components/DeviceDetector";
import { GoogleAnalytics } from "@next/third-parties/google";
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
    default: "MangaLabTH — อ่านมังงะแปลไทย มังงะเกาหลี อ่านการ์ตูนออนไลน์ฟรี อัปเดตล่าสุด",
  },
  description:
    "MangaLabTH ศูนย์รวมมังงะฮิต อ่านมังงะ และ อ่านการ์ตูนออนไลน์ฟรี อัปเดตตอนใหม่ล่าสุดทุกวัน ครบทุกแนว ทั้ง มังงะแปลไทย ภาพคมชัด มังงะเกาหลี สุดมันส์ โหลดไวไม่มีสะดุด",
  keywords: [
    "มังงะ", "อ่านมังงะ", "มังงะแปลไทย", "manga", "MangaLabTH",
    "เว็บอ่านมังงะ", "มังงะฮิต", "อ่านการ์ตูน", "อ่านมังงะฟรี",
    "มังงะเกาหลี", "มังงะญี่ปุ่น", "มังงะจีน",
  ],
  authors: [{ name: "MangaLabTH" }],
  openGraph: {
    title: "MangaLabTH — อ่านมังงะแปลไทย มังงะเกาหลี อ่านการ์ตูนฟรี",
    description:
      "MangaLabTH ศูนย์รวมมังงะฮิต อ่านมังงะ และ อ่านการ์ตูนออนไลน์ฟรี ขนทัพ มังงะแปลไทย และ มังงะเกาหลี อัปเดตตอนใหม่ล่าสุดก่อนใคร",
    siteName: "MangaLabTH",
    locale: "th_TH",
    type: "website",
    images: [
      {
        url: "/og-default.webp",
        width: 1200,
        height: 630,
        alt: "MangaLabTH — อ่านมังงะแปลไทยออนไลน์ฟรี",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MangaLabTH — อ่านมังงะแปลไทย มังงะเกาหลี อ่านการ์ตูนฟรี",
    description:
      "MangaLabTH แพลตฟอร์ม อ่านมังงะ ที่ดีที่สุด รวบรวม มังงะแปลไทย และ มังงะเกาหลี ไว้อ่านฟรีเพียบ ภาพคมชัดจุใจบนมือถือ",
    images: ["/og-default.webp"],
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_SITE_URL || "https://mangalab-th.com",
    languages: {
      "th": process.env.NEXT_PUBLIC_SITE_URL || "https://mangalab-th.com",
    },
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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const jsonLdOrganization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "MangaLabTH",
  url: siteUrl,
  logo: `${siteUrl}/logo.webp`,
};

const jsonLdWebSite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "MangaLabTH",
  url: siteUrl,
  potentialAction: {
    "@type": "SearchAction",
    target: `${siteUrl}/search?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      localization={{
        ...thTH,
        signIn: {
          start: {
            title: "เข้าสู่ระบบ",
            subtitle: "เพื่อดำเนินการต่อ",
          },
        },
      }}
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
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(jsonLdOrganization),
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(jsonLdWebSite),
            }}
          />
          <DeviceDetector />
          <ThemeProvider>
            {children}
          </ThemeProvider>
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID as string} />
        </body>
      </html>
    </ClerkProvider>
  );
}

