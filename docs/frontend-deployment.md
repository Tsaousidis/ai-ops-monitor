# Frontend Deployment

The frontend is a Next.js app in the `frontend` directory and is intended
to deploy to Vercel.

## Vercel Project Setup

Use one of these options:

- Set the Vercel project root directory to `frontend`. This is the
  simplest option.
- Or use the root `vercel.json`, which runs install/build commands from
  the repo root and outputs `frontend/.next`.

Recommended Vercel settings:

- Framework preset: Next.js
- Install command: `npm ci`
- Build command: `npm run build`
- Root directory: `frontend`

If you use the root `vercel.json`, keep the project root at the repo
root and let the config run `cd frontend && ...`.

Do not combine both approaches unless you intentionally adjust the
commands. If the Vercel root directory is `frontend`, Vercel should run
commands from inside `frontend`.

## Environment Variables

Set these in Vercel Project Settings:

```text
NEXT_PUBLIC_API_URL=https://your-render-api.onrender.com
NEXT_PUBLIC_WS_URL=wss://your-render-api.onrender.com/ws
```

These are public browser variables. Do not put backend secrets in Vercel
frontend variables.

## Backend CORS

After Vercel gives you a production URL, update the Render backend
environment variable:

```text
CORS_ORIGINS=https://your-vercel-app.vercel.app
```

If you also use a custom domain, include it too:

```text
CORS_ORIGINS=https://your-domain.com,https://your-vercel-app.vercel.app
```

Redeploy the Render API, worker, and beat after environment changes.

## Smoke Test

1. Open the Vercel URL.
2. Confirm the login screen renders.
3. Sign in with the production admin credentials.
4. Confirm the dashboard loads without an API error banner.
5. In the browser devtools Network tab, confirm API calls go to the
   Render backend URL and WebSocket connects with `wss://`.
