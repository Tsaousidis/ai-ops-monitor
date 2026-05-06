from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Service
from app.schemas.service import ServiceCreate


async def create_service(
    db: AsyncSession,
    service_data: ServiceCreate,
):
    service = Service(
        name=service_data.name,
        base_url=service_data.base_url,
    )

    db.add(service)

    await db.commit()

    await db.refresh(service)

    return service


async def get_services(
    db: AsyncSession,
):
    result = await db.execute(
        select(Service)
    )

    return result.scalars().all()


async def get_service_by_id(
    db: AsyncSession,
    service_id: int,
):
    result = await db.execute(
        select(Service).where(
            Service.id == service_id
        )
    )

    return result.scalar_one_or_none()