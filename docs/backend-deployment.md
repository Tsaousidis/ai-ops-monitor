# Backend Deployment

This step prepares the backend for a production deploy on Render with
Neon Postgres and Upstash Redis.

## Services

The root `render.yaml` defines three Docker services:

- `ai-ops-monitor-api`: public FastAPI web service
- `ai-ops-monitor-worker`: Celery worker
- `ai-ops-monitor-beat`: Celery scheduler

The API service runs Alembic migrations as a Render pre-deploy command.
The worker and beat services use the same backend Docker image with
different commands.

## Required External Resources

Create these outside the repo:

- Neon Postgres database
- Upstash Redis database
- Gemini API key, optional but needed for real AI insights

Use provider dashboards to copy connection strings into Render
environment variables. Do not commit real connection strings.

## Render Environment Variables

Set the same values for all three backend services unless noted.

Required:

- `APP_ENV=production`
- `DEBUG=false`
- `LOG_SQL=false`
- `PORT=8000` for the API service
- `DATABASE_URL`
- `REDIS_URL`
- `CELERY_BROKER_URL`
- `CELERY_RESULT_BACKEND`
- `SECRET_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `CORS_ORIGINS`

Optional:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `MONITORING_INTERVAL_SECONDS`
- `ACCESS_TOKEN_EXPIRE_MINUTES`

All three services must share the same `SECRET_KEY`. Generate it once
locally or in a password manager, then paste the same value into the
API, worker, and beat environment variables.

## Connection String Notes

Neon usually provides a URL like:

```text
postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

The backend accepts `postgresql://`, `postgres://`, and
`postgresql+asyncpg://` URLs and normalizes them for async SQLAlchemy.

Upstash Redis usually provides a Redis URL. Use it for:

```text
REDIS_URL
CELERY_BROKER_URL
CELERY_RESULT_BACKEND
```

## Production CORS

After the frontend is deployed, set:

```text
CORS_ORIGINS=https://your-vercel-app.vercel.app
```

Production startup validation rejects localhost origins.

## Smoke Test

After deploy, open:

```text
https://your-render-api.onrender.com/health/
```

Expected response:

```json
{"status":"healthy"}
```

Then test login:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri https://your-render-api.onrender.com/auth/login `
  -ContentType "application/json" `
  -Body '{"username":"admin","password":"YOUR_ADMIN_PASSWORD"}'
```
