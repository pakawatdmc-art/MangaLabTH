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
  title: "mangaFactory — อ่านมังงะออนไลน์",
  description: "แพลตฟอร์มอ่านมังงะออนไลน์ระดับพรีเมียม",
};

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
const hasClerk = clerkKey.startsWith("pk_live_") || clerkKey.startsWith("pk_test_c");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const body = (
    <html lang="th">
      <body
        className={`${inter.variable} ${notoThai.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );

  if (hasClerk) {
    return <ClerkProvider>{body}</ClerkProvider>;
  }
  return body;
}
