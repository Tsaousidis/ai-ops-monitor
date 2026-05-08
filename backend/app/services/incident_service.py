from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Incident


async def create_incident(
    db: AsyncSession,
    service_id: int,
    severity: str,
    title: str,
    description: str,
):
    existing_incident = await db.execute(
        select(Incident).where(
            Incident.service_id == service_id,
            Incident.status == "open",
        )
    )

    existing_incident = (
        existing_incident.scalar_one_or_none()
    )

    if existing_incident:
        return existing_incident

    incident = Incident(
        service_id=service_id,
        severity=severity,
        title=title,
        description=description,
        status="open",
    )

    db.add(incident)

    await db.commit()

    await db.refresh(incident)

    return incident


async def get_all_incidents(
    db: AsyncSession,
):
    result = await db.execute(
        select(Incident).order_by(
            Incident.started_at.desc()
        )
    )

    return result.scalars().all()


async def get_incident_by_id(
    db: AsyncSession,
    incident_id: int,
):
    result = await db.execute(
        select(Incident).where(
            Incident.id == incident_id
        )
    )

    return result.scalar_one_or_none()


async def resolve_open_incidents_for_service(
    db: AsyncSession,
    service_id: int,
):
    result = await db.execute(
        select(Incident).where(
            Incident.service_id == service_id,
            Incident.status == "open",
        )
    )
    incidents = result.scalars().all()

    for incident in incidents:
        incident.status = "resolved"
        incident.resolved_at = datetime.utcnow()

    return incidents
