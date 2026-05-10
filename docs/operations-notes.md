# Operations Notes

## Current Optimizations

- Metrics queries default to the latest 200 samples and cap at 500.
- HTTP health checks use `response.is_success`, so 4xx/5xx responses are
  treated as failed checks.
- Monitoring writes metrics/incidents with `flush()` and commits once at
  the end of the monitoring run.
- WebSocket disconnect handling is idempotent.
- SQL logging is controlled with `LOG_SQL`.

## Scaling Notes

For heavier usage:

- Add pagination to incidents and logs.
- Add retention jobs for old metrics and health checks.
- Move from `NullPool` to tuned connection pooling outside Celery loop
  constraints.
- Run Celery worker and beat as paid/always-on services.
- Add service-level unique open incident constraints if concurrent
  monitoring workers are introduced.

## Free Deployment Limitation

The free deployment path does not include a cloud Celery worker or beat.
Use the dashboard `Run check` button for manual monitoring.
