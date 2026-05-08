from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AlertRule
from app.schemas.alert_rule import AlertRuleUpdate


async def get_alert_rules(db: AsyncSession):
    result = await db.execute(
        select(AlertRule).order_by(AlertRule.service_id.asc())
    )

    return result.scalars().all()


async def get_alert_rule_for_service(
    db: AsyncSession,
    service_id: int,
):
    result = await db.execute(
        select(AlertRule).where(
            AlertRule.service_id == service_id
        )
    )

    return result.scalar_one_or_none()


async def get_or_create_alert_rule_for_service(
    db: AsyncSession,
    service_id: int,
):
    alert_rule = await get_alert_rule_for_service(
        db,
        service_id,
    )

    if alert_rule:
        return alert_rule

    alert_rule = AlertRule(
        service_id=service_id,
        warning_response_time_ms=500.0,
        critical_response_time_ms=1000.0,
        enabled=True,
    )

    db.add(alert_rule)
    await db.flush()

    return alert_rule


async def upsert_alert_rule_for_service(
    db: AsyncSession,
    service_id: int,
    alert_rule_data: AlertRuleUpdate,
):
    alert_rule = await get_or_create_alert_rule_for_service(
        db,
        service_id,
    )

    alert_rule.warning_response_time_ms = (
        alert_rule_data.warning_response_time_ms
    )
    alert_rule.critical_response_time_ms = (
        alert_rule_data.critical_response_time_ms
    )
    alert_rule.enabled = alert_rule_data.enabled

    await db.commit()
    await db.refresh(alert_rule)

    return alert_rule
