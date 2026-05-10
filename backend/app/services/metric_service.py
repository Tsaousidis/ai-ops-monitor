from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Metric


async def create_metric(
    db: AsyncSession,
    service_id: int,
    metric_type: str,
    value: float,
):
    metric = Metric(
        service_id=service_id,
        metric_type=metric_type,
        value=value,
    )

    db.add(metric)

    await db.flush()

    return metric


async def get_service_metrics(
    db: AsyncSession,
    service_id: int,
    limit: int = 200,
):
    result = await db.execute(
        select(Metric)
        .where(Metric.service_id == service_id)
        .order_by(Metric.timestamp.desc())
        .limit(limit)
    )

    return result.scalars().all()
