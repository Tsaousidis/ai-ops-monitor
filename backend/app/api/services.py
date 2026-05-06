from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db

from app.schemas.service import (
    ServiceCreate,
    ServiceResponse,
)

from app.services.service_service import (
    create_service,
    get_service_by_id,
    get_services,
)

router = APIRouter(
    prefix="/services",
    tags=["Services"],
)


@router.post(
    "/",
    response_model=ServiceResponse,
)
async def create_new_service(
    service_data: ServiceCreate,
    db: AsyncSession = Depends(get_db),
):
    return await create_service(
        db,
        service_data,
    )


@router.get(
    "/",
    response_model=list[ServiceResponse],
)
async def list_services(
    db: AsyncSession = Depends(get_db),
):
    return await get_services(db)


@router.get(
    "/{service_id}",
    response_model=ServiceResponse,
)
async def get_single_service(
    service_id: int,
    db: AsyncSession = Depends(get_db),
):
    service = await get_service_by_id(
        db,
        service_id,
    )

    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service not found",
        )

    return service