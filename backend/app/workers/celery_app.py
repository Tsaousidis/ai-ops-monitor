from celery import Celery

from app.core.settings import settings

celery_app = Celery(
    "ai_ops_monitor",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "monitor-services-periodically": {
            "task": "monitoring.check_services",
            "schedule": settings.MONITORING_INTERVAL_SECONDS,
        },
    },
)
