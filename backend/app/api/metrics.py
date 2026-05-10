from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db
from app.api.dependencies import get_current_admin

from app.schemas.metric import (
    MetricResponse,
)

from app.services.metric_service import (
    get_service_metrics,
)

router = APIRouter(
    prefix="/metrics",
    tags=["Metrics"],
    dependencies=[Depends(get_current_admin)],
)


@router.get(
    "/service/{service_id}",
    response_model=list[MetricResponse],
)
async def get_metrics_for_service(
    service_id: int,
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
):
    return await get_service_metrics(
        db,
        service_id,
        limit=min(limit, 500),
    )
