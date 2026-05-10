# Free Deployment Path

This is the zero-cost deployment path for the portfolio/demo version of
AI Ops Monitor.

## What Runs for Free

- Backend API as one free Render web service
- Frontend as one free Vercel project
- Postgres on a free external provider, such as Neon
- Redis on a free external provider, such as Upstash, optional

## What We Skip on Free

Continuous background infrastructure is not free on Render:

- No Render Blueprint
- No always-on Celery worker
- No always-on Celery beat scheduler

Impact:

- The dashboard still works.
- Login still works.
- Services, incidents, logs, metrics, and AI insights still work.
- Manual `Run check` still works.
- Periodic monitoring does not run automatically in the cloud.
- Queued AI insight jobs should not be used unless a worker is deployed.

For a free portfolio deployment, this is acceptable because the user can
trigger checks from the dashboard.

## Backend on Render Free Web Service

Create one Render Web Service manually.

Recommended settings:

```text
Runtime: Docker
Root Directory: backend
Dockerfile Path: Dockerfile
Start Command:
sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"
Health Check Path: /health/
Instance Type: Free
```

Environment variables:

```text
APP_NAME=AI Ops Monitor
APP_ENV=production
DEBUG=false
LOG_SQL=false
PORT=8000

DATABASE_URL=<your Neon Postgres URL>
REDIS_URL=<your Upstash Redis URL or redis://localhost:6379/0>
CELERY_BROKER_URL=<same as REDIS_URL, optional on free>
CELERY_RESULT_BACKEND=<same as REDIS_URL, optional on free>

GEMINI_API_KEY=<optional>
GEMINI_MODEL=gemini-2.5-flash
MONITORING_INTERVAL_SECONDS=60

SECRET_KEY=<random 32+ character secret>
ACCESS_TOKEN_EXPIRE_MINUTES=720
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<strong admin password>
CORS_ORIGINS=<your Vercel frontend URL>
```

If Render asks for payment when creating a Blueprint, do not use the
Blueprint flow. Use a single manual Web Service instead.

## Frontend on Vercel Free

Create a Vercel project for the same GitHub repo.

Recommended settings:

```text
Root Directory: frontend
Framework Preset: Next.js
Install Command: npm ci
Build Command: npm run build
```

Environment variables:

```text
NEXT_PUBLIC_API_URL=https://your-render-api.onrender.com
NEXT_PUBLIC_WS_URL=wss://your-render-api.onrender.com/ws
```

After Vercel deploys, copy its URL back into Render:

```text
CORS_ORIGINS=https://your-vercel-app.vercel.app
```

Redeploy the Render backend after changing CORS.

## Smoke Test

Backend:

```text
https://your-render-api.onrender.com/health/
```

Expected:

```json
{"status":"healthy"}
```

Frontend:

```text
https://your-vercel-app.vercel.app
```

Expected:

- Login screen renders.
- Login succeeds with production admin credentials.
- Dashboard loads.
- Manual `Run check` works after you add a service.
