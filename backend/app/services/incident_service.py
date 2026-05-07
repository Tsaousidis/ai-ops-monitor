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