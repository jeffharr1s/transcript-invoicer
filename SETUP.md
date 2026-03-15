# Transcript Invoicer — Setup & Deployment

## Prerequisites

- Node.js 18+
- Supabase account (free tier works)
- Anthropic API key
- Vercel account (for deployment)

## 1. Local Setup

```bash
cd transcript-invoicer
cp .env.local.example .env.local
npm install
```

Edit `.env.local` with your keys:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ANTHROPIC_API_KEY=sk-ant-your-key
```

## 2. Supabase Setup

### Create project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy the project URL and anon key into `.env.local`

### Run migrations

In the Supabase SQL editor, paste and run the contents of:

```
supabase/migrations/001_initial_schema.sql
```

Or use the Supabase CLI:

```bash
npx supabase db push
```

### Configure Auth

1. Go to Authentication → Settings
2. Set Site URL to `http://localhost:3000` (dev) or your production URL
3. Add `http://localhost:3000/auth/callback` to Redirect URLs

## 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 4. Deploy to Vercel

```bash
npx vercel
```

Or connect your GitHub repo at [vercel.com](https://vercel.com).

### Environment Variables in Vercel

Add these in Vercel → Project → Settings → Environment Variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |

### Update Supabase Auth

Add your Vercel production URL to:
- Authentication → Settings → Site URL
- Authentication → Settings → Redirect URLs (`https://your-app.vercel.app/auth/callback`)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── analyze-transcript/route.ts   # AI analysis endpoint
│   │   └── sessions/
│   │       ├── route.ts                  # List sessions
│   │       └── [id]/route.ts             # Get session
│   ├── auth/callback/route.ts            # OAuth callback
│   ├── dashboard/page.tsx                # Main app
│   ├── login/page.tsx                    # Sign in
│   ├── signup/page.tsx                   # Sign up
│   ├── page.tsx                          # Landing
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/button.tsx                     # Button component
│   ├── transcript-form.tsx               # Transcript input form
│   ├── analysis-results.tsx              # Results display (5 tabs)
│   └── session-list.tsx                  # Invoice history
├── lib/
│   ├── ai/
│   │   ├── analyze.ts                    # Claude API integration
│   │   └── prompt.ts                     # System prompt + builder
│   └── supabase/
│       ├── client.ts                     # Browser client
│       ├── server.ts                     # Server client
│       └── middleware.ts                 # Auth middleware
├── types/index.ts                        # TypeScript types
└── middleware.ts                          # Next.js middleware
```
