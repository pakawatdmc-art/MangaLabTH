# MangaLabTH Frontend

Next.js 16.2.4 (App Router + Turbopack) frontend สำหรับ MangaLabTH — แพลตฟอร์มอ่านมังงะออนไลน์

## Tech Stack

- **Framework:** Next.js 16.2.4 (App Router + Turbopack)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS v4 + LightningCSS
- **Auth:** Clerk (`@clerk/nextjs` + Thai localization)
- **Charts:** ApexCharts (react-apexcharts)
- **Drag & Drop:** dnd-kit (sortable)
- **Icons:** Lucide React
- **Fonts:** Inter + Noto Sans Thai (Google Fonts via `next/font`)
- **Analytics:** Google Analytics 4 (`@next/third-parties`)
- **Deployment:** Vercel

## Quick Start

```bash
npm install
cp .env.example .env.local
# Fill in all variables (see root README for details)
npm run dev       # → http://localhost:3000
```

## Project Structure

```
src/
├── proxy.ts                # Clerk auth proxy (protects /admin, /coins, /profile)
├── app/
│   ├── layout.tsx           # Root: ClerkProvider, fonts, JSON-LD, ThemeProvider
│   ├── globals.css          # Design system (Tailwind v4)
│   ├── robots.ts            # SEO robots.txt
│   ├── sitemap.ts           # Dynamic ISR sitemap
│   ├── (reader)/            # Public reader layout group
│   │   ├── page.tsx         # Homepage
│   │   ├── [slug]/[chapterSlug]/  # Chapter reader
│   │   ├── manga/[slug]/   # Manga detail
│   │   ├── coins/           # Coin purchase (QR / TrueWallet)
│   │   ├── search/          # Search with filters
│   │   ├── category/[slug]/ # Category filter
│   │   └── profile/         # User profile
│   ├── admin/               # Admin dashboard
│   │   ├── page.tsx         # Stats dashboard
│   │   ├── manga/           # Manga CRUD
│   │   ├── chapters/        # Chapter management + image upload
│   │   ├── users/           # User management
│   │   ├── transactions/    # Transaction ledger
│   │   └── analytics/       # Marketing analytics charts
│   └── api/revalidate/      # ISR revalidation webhook
├── components/              # Shared UI components
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── MangaCard.tsx
│   ├── TopMangaRanking.tsx
│   ├── ChapterListClient.tsx
│   ├── SearchAutocomplete.tsx
│   ├── ThemeProvider.tsx + ThemeSwitcher.tsx
│   └── ...
└── lib/
    ├── api.ts               # API client with retry logic
    ├── types.ts             # TypeScript interfaces + shared constants (TX_LABELS)
    ├── utils.ts             # Utility functions
    ├── analytics.ts         # GA4 event tracking (13 events, Key Events configured)
    ├── clerk.ts             # Clerk key detection helper
    └── clerkAppearance.ts   # Clerk theme customization
```

## Deployment (Vercel)

1. Import repository → set **Root Directory** to `frontend`
2. Set environment variables (see root `README.md`)
3. Deploy!
