from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db
from app.schemas.log import LogResponse
from app.services.log_service import get_logs

router = APIRouter(
    prefix="/logs",
    tags=["Logs"],
)


@router.get(
    "/",
    response_model=list[LogResponse],
)
async def list_logs(
    service_id: int | None = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    return await get_logs(
        db,
        service_id=service_id,
        limit=min(limit, 200),
    )
