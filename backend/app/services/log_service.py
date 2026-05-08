from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Log


async def create_log(
    db: AsyncSession,
    service_id: int,
    level: str,
    message: str,
):
    log = Log(
        service_id=service_id,
        level=level,
        message=message,
    )

    db.add(log)

    await db.flush()

    return log


async def get_logs(
    db: AsyncSession,
    service_id: int | None = None,
    limit: int = 50,
):
    query = select(Log).order_by(Log.timestamp.desc()).limit(limit)

    if service_id is not None:
        query = (
            select(Log)
            .where(Log.service_id == service_id)
            .order_by(Log.timestamp.desc())
            .limit(limit)
        )

    result = await db.execute(query)

    return result.scalars().all()
