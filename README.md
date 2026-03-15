# Transcript Invoicer

Convert consulting session transcripts into professional billable invoices using AI — in under 10 seconds.

## What It Does

Paste a transcript from a client call, and the AI automatically:

1. Extracts a timeline of every consulting activity (troubleshooting, diagnostics, configuration, advisory, etc.)
2. Groups events into billable service categories using 0.25-hour increments
3. Generates a client-ready invoice with line items, totals, and business impact
4. Produces a copy-pasteable client text summary
5. Creates a detailed internal time log for your records
6. Exports a professional PDF invoice

## Features

- **AI-Powered Analysis** — Two-stage pipeline: event extraction, then billable reconstruction
- **Smart Chunking** — Long transcripts (2+ hour calls) are split at natural breaks (speaker changes, pauses, topic shifts) and analyzed in parallel
- **PDF Export** — Professional invoices generated client-side with @react-pdf/renderer
- **Client Management** — Auto-saves clients with default rates for repeat billing
- **Invoice History** — All past invoices stored and searchable
- **Cloud Storage** — Generated PDFs backed up to Supabase Storage
- **Auth** — Email/password authentication with row-level security

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TailwindCSS 4 |
| Backend | Next.js API Routes |
| Database | Supabase (Postgres) with RLS |
| AI | Claude API (Anthropic) |
| PDF | @react-pdf/renderer |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Tests | Vitest |

## Quick Start

### Prerequisites

- Node.js 18+
- [Supabase](https://supabase.com) account (free tier works)
- [Anthropic API key](https://console.anthropic.com)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/transcript-invoicer.git
cd transcript-invoicer
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run both migration files in order:
   - `supabase/migrations/001_initial_schema.sql` — creates tables and RLS policies
   - `supabase/migrations/002_storage_bucket.sql` — creates PDF storage bucket
3. Go to **Authentication > URL Configuration**:
   - Set Site URL to `http://localhost:3000`
   - Add `http://localhost:3000/auth/callback` to Redirect URLs

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ANTHROPIC_API_KEY=sk-ant-your-key
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── analyze-transcript/route.ts   # AI analysis endpoint
│   │   ├── clients/route.ts              # Client CRUD
│   │   ├── invoices/upload-pdf/route.ts   # PDF cloud storage
│   │   ├── profile/route.ts              # User profile
│   │   └── sessions/                     # Invoice history
│   ├── auth/callback/route.ts            # OAuth callback
│   ├── dashboard/page.tsx                # Main app
│   ├── settings/page.tsx                 # User settings
│   ├── login/page.tsx
│   └── signup/page.tsx
├── components/
│   ├── analysis-results.tsx              # 5-tab results view
│   ├── transcript-form.tsx               # Input form with client dropdown
│   ├── session-list.tsx                  # Invoice history list
│   ├── invoice-pdf.tsx                   # PDF layout component
│   └── pdf-download-button.tsx           # PDF generation + upload
├── lib/
│   ├── ai/
│   │   ├── analyze.ts                    # Main pipeline (chunk → analyze → merge)
│   │   ├── chunker.ts                    # Natural-break transcript splitting
│   │   ├── merge.ts                      # Multi-chunk result merging
│   │   ├── prompt.ts                     # System prompt
│   │   └── __tests__/                    # 14 unit tests
│   └── supabase/
│       ├── client.ts                     # Browser client
│       ├── server.ts                     # Server client
│       └── middleware.ts                 # Auth middleware
└── types/index.ts                        # TypeScript types
```

## Deploy to Vercel

```bash
npx vercel
```

Add these environment variables in Vercel dashboard:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`

Update Supabase Auth redirect URLs to include your production domain.

## Testing

```bash
npm test            # Run all tests
npm run test:watch  # Watch mode
```

## License

MIT
