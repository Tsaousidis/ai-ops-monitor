from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.ai.gemini_service import generate_incident_insight
from app.db.models import AIInsight
from app.db.models import Incident


async def get_incident_insights(
    db: AsyncSession,
    incident_id: int,
):
    result = await db.execute(
        select(AIInsight)
        .where(AIInsight.incident_id == incident_id)
        .order_by(AIInsight.created_at.desc())
    )

    return result.scalars().all()


async def generate_and_store_incident_insight(
    db: AsyncSession,
    incident_id: int,
):
    incident_result = await db.execute(
        select(Incident)
        .options(selectinload(Incident.service))
        .where(Incident.id == incident_id)
    )
    incident = incident_result.scalar_one_or_none()

    if not incident:
        return None

    existing_insights = await get_incident_insights(
        db,
        incident_id,
    )

    if existing_insights:
        return existing_insights[0]

    insight_data = await generate_incident_insight(incident)
    insight = AIInsight(
        incident_id=incident.id,
        summary=insight_data["summary"],
        root_cause=insight_data["root_cause"],
    )

    db.add(insight)

    await db.commit()

    await db.refresh(insight)

    return insight
