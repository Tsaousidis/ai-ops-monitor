from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db
from app.schemas.alert_rule import AlertRuleResponse
from app.schemas.alert_rule import AlertRuleUpdate
from app.services.alert_rule_service import get_alert_rules
from app.services.alert_rule_service import (
    get_or_create_alert_rule_for_service,
)
from app.services.alert_rule_service import (
    upsert_alert_rule_for_service,
)
from app.services.service_service import get_service_by_id

router = APIRouter(
    prefix="/alert-rules",
    tags=["Alert Rules"],
)


@router.get(
    "/",
    response_model=list[AlertRuleResponse],
)
async def list_alert_rules(
    db: AsyncSession = Depends(get_db),
):
    return await get_alert_rules(db)


@router.get(
    "/service/{service_id}",
    response_model=AlertRuleResponse,
)
async def get_service_alert_rule(
    service_id: int,
    db: AsyncSession = Depends(get_db),
):
    service = await get_service_by_id(db, service_id)

    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service not found",
        )

    alert_rule = await get_or_create_alert_rule_for_service(
        db,
        service_id,
    )

    await db.commit()
    await db.refresh(alert_rule)

    return alert_rule


@router.put(
    "/service/{service_id}",
    response_model=AlertRuleResponse,
)
async def update_service_alert_rule(
    service_id: int,
    alert_rule_data: AlertRuleUpdate,
    db: AsyncSession = Depends(get_db),
):
    service = await get_service_by_id(db, service_id)

    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service not found",
        )

    if (
        alert_rule_data.warning_response_time_ms
        >= alert_rule_data.critical_response_time_ms
    ):
        raise HTTPException(
            status_code=422,
            detail=(
                "Warning threshold must be lower than "
                "critical threshold"
            ),
        )

    return await upsert_alert_rule_for_service(
        db,
        service_id,
        alert_rule_data,
    )
