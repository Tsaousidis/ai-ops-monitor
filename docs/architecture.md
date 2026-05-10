# Architecture

AI Ops Monitor is split into a FastAPI backend and a Next.js frontend.
The backend owns monitoring, persistence, authentication, incident
actions, and realtime events. The frontend renders the authenticated
operations dashboard.

## System Components

```text
Next.js Dashboard
  | REST + WebSocket
FastAPI Backend
  | async SQLAlchemy
PostgreSQL

FastAPI Backend
  | publish / consume
Redis + Celery

FastAPI Backend
  | incident prompt
Gemini API
```

## Backend Modules

- `app/main.py`: FastAPI app, CORS, routers
- `app/api`: route handlers
- `app/services`: persistence and domain operations
- `app/monitoring`: health check and monitoring pipeline
- `app/workers`: Celery app and tasks
- `app/websocket`: live event manager
- `app/core`: settings and security
- `app/db`: SQLAlchemy engine, session, models
- `app/schemas`: Pydantic request/response models

## Data Model

Core tables:

- `services`: monitored services
- `metrics`: response time and availability samples
- `health_checks`: raw health-check results
- `logs`: dashboard event log
- `incidents`: open/resolved service incidents
- `ai_insights`: generated incident summaries
- `alert_rules`: per-service warning/critical thresholds

## Monitoring Pipeline

```text
Run check
  -> load services + alert rules
  -> perform HTTP health check
  -> write health_check
  -> write response_time metric
  -> write availability metric
  -> update service status
  -> create or resolve incidents
  -> write log
  -> broadcast WebSocket events
```

HTTP responses outside the 2xx range are treated as failed health
checks. Response time is measured in milliseconds.

## Incident Flow

An incident opens when:

- a service is offline
- response time crosses the critical threshold

An incident resolves automatically when the service returns to healthy.
Admins can also resolve, reopen, or escalate incidents manually.

## AI Insight Flow

When an admin requests an AI insight:

```text
incident -> prompt -> Gemini -> JSON summary/root cause -> ai_insights
```

If Gemini is not configured or fails, the backend stores a deterministic
fallback insight so the dashboard still behaves predictably.

## Realtime Flow

The dashboard opens an authenticated WebSocket connection:

```text
ws://backend/ws?token=<jwt>
```

The backend broadcasts:

- `service_update`
- `incident_update`
- `log_update`

The frontend refreshes affected dashboard state when events arrive.

## Authentication

The backend exposes:

- `POST /auth/login`
- `GET /auth/me`

Admin credentials come from environment variables. Successful login
returns a signed JWT. Protected API routes require:

```text
Authorization: Bearer <token>
```

The WebSocket endpoint requires the token as a query parameter.

## Deployment Shapes

Local production simulation:

```text
docker compose up --build
```

Free cloud demo:

- Render web service for API
- Vercel for frontend
- manual monitoring checks

Production-style cloud:

- API web service
- Celery worker
- Celery beat
- managed Postgres
- managed Redis
