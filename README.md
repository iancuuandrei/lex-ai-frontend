# LexAI Frontend

## Stack

- Vite
- React
- TypeScript
- React Router
- Tailwind

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Environment

```bash
VITE_API_BASE_URL=http://127.0.0.1:8010
```

Important:

- `VITE_API_BASE_URL` must be the backend origin only.
- It should not include `/api`.
- Example local value: `http://127.0.0.1:8010`
- Example production value: `https://your-backend.example.com`

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Vercel deploy

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Required environment variable: `VITE_API_BASE_URL`
- Backend must allow CORS from the deployed Vercel domain.
- `vercel.json` rewrites all routes to `/index.html` because this is a BrowserRouter SPA.
