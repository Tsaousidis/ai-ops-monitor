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
    resolve_open_incidents_for_service,
)

from app.services.log_service import (
    create_log,
)

from app.services.metric_service import (
    create_metric,
)

from app.websocket.websocket_manager import (
    manager,
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
        previous_status = service.status

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
            resolved_incidents = (
                await resolve_open_incidents_for_service(
                    db,
                    service.id,
                )
            )

            if resolved_incidents:
                await create_log(
                    db=db,
                    service_id=service.id,
                    level="info",
                    message=(
                        f"{service.name} recovered; "
                        f"{len(resolved_incidents)} incident(s) resolved"
                    ),
                )

                for incident in resolved_incidents:
                    await manager.broadcast({
                        "event": "incident_update",
                        "data": {
                            "id": incident.id,
                            "service_id": service.id,
                            "severity": incident.severity,
                            "title": incident.title,
                            "status": incident.status,
                        },
                    })

        else:
            service.status = "offline"

            incident = await create_incident(
                db=db,
                service_id=service.id,
                severity="critical",
                title=f"{service.name} is offline",
                description=(
                    f"Health check failed for "
                    f"{service.base_url}"
                ),
            )

            await manager.broadcast({
                "event": "incident_update",
                "data": {
                    "id": incident.id,
                    "service_id": service.id,
                    "severity": incident.severity,
                    "title": incident.title,
                    "status": incident.status,
                },
            })

        log_level = (
            "error"
            if not health_result["success"]
            else "info"
        )
        log_message = (
            f"Health check for {service.name} returned "
            f"{health_result['status_code']} in "
            f"{health_result['response_time']}ms"
        )

        if previous_status != service.status:
            log_message = (
                f"{service.name} changed from {previous_status} "
                f"to {service.status}. {log_message}"
            )

        log = await create_log(
            db=db,
            service_id=service.id,
            level=log_level,
            message=log_message,
        )

        monitoring_results.append({
            "service_id": service.id,
            "service": service.name,
            "status": service.status,
            "response_time": health_result["response_time"],
        })

        await manager.broadcast({
            "event": "service_update",
            "data": {
                "service_id": service.id,
                "service": service.name,
                "status": service.status,
                "response_time": health_result[
                    "response_time"
                ],
            },
        })

        await manager.broadcast({
            "event": "log_update",
            "data": {
                "id": log.id,
                "service_id": service.id,
                "level": log.level,
                "message": log.message,
                "timestamp": log.timestamp.isoformat(),
            },
        })

    await db.commit()

    return monitoring_results
