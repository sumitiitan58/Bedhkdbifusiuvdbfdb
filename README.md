# PREPSKM.IN — JEE, NEET & Class 9–12 Study Platform

Official repository for **[https://prepskm.in](https://prepskm.in)** by **Sumit (`@unfiltereddsumit`)**.

## Tech Stack
- **Frontend**: React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Motion + Recharts + KaTeX
- **Deployment & Serverless API**: Exclusively configured for **Vercel** (`vercel.json` + `/api/*.ts` Vercel Functions)
- **Local Dev Server**: Express + Vite middleware (`server.ts`) mirroring `/api/*` locally on port `3000`
- **Persistence**: Firebase Auth (Google Sign-In), Cloud Firestore, and local guest study storage

## Local Development
```bash
npm install
npm run dev
```

## Production Build
```bash
npm run build
```
Build output is generated in `dist/` (including `index.html`, favicons, manifest, `robots.txt`, `sitemap.xml`, pre-rendered SEO routes, and hashed assets).

## Deploying on Vercel (`prepskm.in`)
This repository is configured exclusively for **Vercel** via `vercel.json`:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node.js Version**: `20.x` or `22.x`

### Required Server-Only Environment Variables (Vercel Project Settings → Environment Variables)
Add one or more AI provider keys as **server-only** variables (never prefix private keys with `VITE_`):
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `DEEPSEEK_API_KEY`
- `OPENROUTER_API_KEY`
- `MISTRAL_API_KEY`

Leave `VITE_API_BASE_URL` blank on Vercel so all frontend requests call same-origin `/api/*` Vercel Functions directly.

### Firebase Auth Authorized Domains
For Google Sign-In on your Vercel domain:
1. Open **Firebase Console → Authentication → Settings → Authorized domains**
2. Add `prepskm.in`, `www.prepskm.in`, and your `*.vercel.app` preview domain.
