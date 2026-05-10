# Environment Hardening

AI Ops Monitor uses typed backend settings loaded from environment
variables. Local defaults are intentionally convenient, while production
settings are validated more strictly at application startup.

## Environment Modes

- `APP_ENV=local`: Docker-based local production simulation.
- `APP_ENV=development`: non-container local development.
- `APP_ENV=staging`: production-like pre-release deployments.
- `APP_ENV=production`: live deployments with strict startup checks.

When `APP_ENV=production`, the backend refuses to start if:

- `DEBUG=true`
- `SECRET_KEY` is missing or shorter than 32 characters
- `CORS_ORIGINS` contains `localhost` or `127.0.0.1`

## Secrets Strategy

Never commit real secrets. Commit only example files:

- `.env.docker.example`
- `.env.production.example`
- `backend/.env.example`
- `frontend/.env.example`

Store real values in the target platform secret manager:

- Render environment variables for the backend, worker, and beat
- Neon connection string for Postgres
- Upstash connection string for Redis
- Vercel environment variables for public frontend URLs

## Required Backend Variables

- `APP_ENV`
- `DATABASE_URL`
- `REDIS_URL`
- `SECRET_KEY`
- `CORS_ORIGINS`

## Optional Backend Variables

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `CELERY_BROKER_URL`
- `CELERY_RESULT_BACKEND`
- `MONITORING_INTERVAL_SECONDS`
- `LOG_SQL`

## Frontend Variables

Frontend variables with the `NEXT_PUBLIC_` prefix are bundled into the
browser build and must not contain secrets.

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`
