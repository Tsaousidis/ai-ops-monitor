from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    HealthCheck,
    Service,
)

from app.monitoring.health_checker import (
    check_service_health,
)

from app.services.incident_service import (
    create_incident,
)

from app.services.metric_service import (
    create_metric,
)


async def monitor_all_services(
    db: AsyncSession,
):
    result = await db.execute(
        select(Service)
    )

    services = result.scalars().all()

    monitoring_results = []

    for service in services:

        health_result = await check_service_health(
            service.base_url
        )

        health_check = HealthCheck(
            service_id=service.id,
            status_code=health_result["status_code"],
            response_time=health_result["response_time"],
            success=health_result["success"],
        )

        db.add(health_check)

        await create_metric(
            db=db,
            service_id=service.id,
            metric_type="response_time",
            value=health_result["response_time"],
        )

        availability_value = (
            1.0 if health_result["success"] else 0.0
        )

        await create_metric(
            db=db,
            service_id=service.id,
            metric_type="availability",
            value=availability_value,
        )

        if health_result["success"]:
            service.status = "healthy"

        else:
            service.status = "offline"

            await create_incident(
                db=db,
                service_id=service.id,
                severity="critical",
                title=f"{service.name} is offline",
                description=(
                    f"Health check failed for "
                    f"{service.base_url}"
                ),
            )

        monitoring_results.append({
            "service": service.name,
            "status": service.status,
            "response_time": health_result["response_time"],
        })

    await db.commit()

    return monitoring_results