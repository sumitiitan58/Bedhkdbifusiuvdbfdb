# PREPSKM.IN — JEE, NEET & Class 9–12 Study Platform

Official repository for **[https://prepskm.in](https://prepskm.in)** by **Sumit (`@unfiltereddsumit`)**.

## Tech Stack
- **Frontend**: React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Motion + Recharts
- **Backend & Persistence**: Firebase Auth (Google Sign-In), Cloud Firestore (`ai-studio-prepskminjeeneet-730a42da-491c-4a04-bc9c-abb88c4d760c`), Firebase Storage
- **AI Endpoints**: Express (`server.ts`) for Node/Cloud Run + Netlify Function (`netlify/functions/gemini.mjs`) for serverless hosting

## Local Development
```bash
npm install
npm run dev
```

## Production Build
```bash
npm run build
```
Build output is generated in `dist/` (including `index.html`, favicons, manifest, robots.txt, sitemap.xml, `_redirects`, and bundled assets).

## Deploying from GitHub (Works Identically on Any Host)

### 1. Netlify (`prepskm.in`)
`netlify.toml` and `public/_redirects` are pre-configured in this repository:
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: `22` (pinned in `netlify.toml` & `.nvmrc`)
- **Optional Environment Variable**: Add `GEMINI_API_KEY` in **Site configuration → Environment variables** to enable live Gemini AI Mentor, PDF Question Extraction, and Question Explainer on Netlify.
- **Important**: If your existing Netlify site previously had an empty Build Command or Publish Directory set to `.`, go to **Site configuration → Build & deploy → Build settings** and ensure Build command is `npm run build` and Publish directory is `dist`, then trigger **Clear cache and deploy site**.

### 2. Firebase Hosting (`prepskm.in`)
`firebase.json` and `.firebaserc` are pre-configured for project `gen-lang-client-0309095308`:
```bash
npm run build
npx firebase-tools deploy --only hosting
```
Then connect `prepskm.in` under **Firebase Console → Hosting → Add custom domain**.

### 3. Vercel / Cloudflare Pages
- **Vercel**: Auto-detected via `vercel.json` (`npm run build` → `dist`).
- **Cloudflare Pages**: Set **Build command** to `npm run build`, **Build output directory** to `dist`, and `NODE_VERSION=22` (`public/_redirects` handles SPA routes).

## Required One-Time Firebase Setup for `prepskm.in`
For **Google Sign-In** to work on your custom domain:
1. Open **Firebase Console** → Project `gen-lang-client-0309095308`
2. Go to **Authentication → Settings → Authorized domains**
3. Click **Add domain** and add:
   - `prepskm.in`
   - `www.prepskm.in`
