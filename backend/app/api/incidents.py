from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db

from app.schemas.incident import (
    IncidentResponse,
)

from app.services.incident_service import (
    get_all_incidents,
)

router = APIRouter(
    prefix="/incidents",
    tags=["Incidents"],
)


@router.get(
    "/",
    response_model=list[IncidentResponse],
)
async def list_incidents(
    db: AsyncSession = Depends(get_db),
):
    return await get_all_incidents(db)