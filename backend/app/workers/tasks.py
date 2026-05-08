import asyncio

from app.db.session import AsyncSessionLocal
from app.monitoring.monitor_service import monitor_all_services
from app.services.ai_insight_service import (
    generate_and_store_incident_insight,
)
from app.workers.celery_app import celery_app


async def _generate_incident_insight(
    incident_id: int,
):
    async with AsyncSessionLocal() as db:
        insight = await generate_and_store_incident_insight(
            db,
            incident_id,
        )

        if not insight:
            return None

        return {
            "id": insight.id,
            "incident_id": insight.incident_id,
            "summary": insight.summary,
            "root_cause": insight.root_cause,
        }


@celery_app.task(name="ai.generate_incident_insight")
def generate_incident_insight_task(
    incident_id: int,
):
    return asyncio.run(
        _generate_incident_insight(incident_id)
    )


async def _run_monitoring_check():
    async with AsyncSessionLocal() as db:
        return await monitor_all_services(db)


@celery_app.task(name="monitoring.check_services")
def check_services_task():
    return asyncio.run(_run_monitoring_check())
