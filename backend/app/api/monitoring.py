from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db
from app.api.dependencies import get_current_admin

from app.monitoring.monitor_service import (
    monitor_all_services,
)

router = APIRouter(
    prefix="/monitoring",
    tags=["Monitoring"],
    dependencies=[Depends(get_current_admin)],
)


@router.post("/check-services")
async def check_services(
    db: AsyncSession = Depends(get_db),
):
    return await monitor_all_services(db)
