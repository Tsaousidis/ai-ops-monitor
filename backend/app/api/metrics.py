from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db

from app.schemas.metric import (
    MetricResponse,
)

from app.services.metric_service import (
    get_service_metrics,
)

router = APIRouter(
    prefix="/metrics",
    tags=["Metrics"],
)


@router.get(
    "/service/{service_id}",
    response_model=list[MetricResponse],
)
async def get_metrics_for_service(
    service_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await get_service_metrics(
        db,
        service_id,
    )