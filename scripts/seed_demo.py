import asyncio
import sys
from datetime import datetime
from datetime import timedelta
from pathlib import Path

from sqlalchemy import delete
from sqlalchemy import select

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.db.models import AIInsight
from app.db.models import AlertRule
from app.db.models import HealthCheck
from app.db.models import Incident
from app.db.models import Log
from app.db.models import Metric
from app.db.models import Service
from app.db.session import AsyncSessionLocal


DEMO_SERVICES = [
    {
        "name": "Checkout API",
        "base_url": "https://example.com/checkout",
        "status": "healthy",
        "response_times": [
            182,
            176,
            188,
            194,
            201,
            196,
            184,
            178,
            173,
            168,
        ],
        "availability": 1.0,
    },
    {
        "name": "Payments Gateway",
        "base_url": "https://example.com/payments",
        "status": "warning",
        "response_times": [
            412,
            436,
            455,
            489,
            522,
            548,
            538,
            516,
            501,
            492,
        ],
        "availability": 1.0,
    },
    {
        "name": "Orders Worker",
        "base_url": "https://example.com/orders",
        "status": "critical",
        "response_times": [
            640,
            702,
            748,
            826,
            910,
            1024,
            1128,
            1194,
            1086,
            1048,
        ],
        "availability": 1.0,
    },
    {
        "name": "Notifications",
        "base_url": "https://example.com/notifications",
        "status": "healthy",
        "response_times": [
            221,
            214,
            207,
            218,
            226,
            219,
            211,
            205,
            198,
            193,
        ],
        "availability": 1.0,
    },
]


async def clear_demo_data(db):
    service_names = [service["name"] for service in DEMO_SERVICES]
    service_ids_result = await db.execute(
        select(Service.id).where(Service.name.in_(service_names))
    )
    service_ids = list(service_ids_result.scalars().all())

    if not service_ids:
        return

    incident_ids_result = await db.execute(
        select(Incident.id).where(Incident.service_id.in_(service_ids))
    )
    incident_ids = list(incident_ids_result.scalars().all())

    if incident_ids:
        await db.execute(
            delete(AIInsight).where(
                AIInsight.incident_id.in_(incident_ids)
            )
        )

    for model in [
        AlertRule,
        HealthCheck,
        Metric,
        Log,
        Incident,
    ]:
        await db.execute(
            delete(model).where(model.service_id.in_(service_ids))
        )

    await db.execute(
        delete(Service).where(Service.id.in_(service_ids))
    )


async def seed_demo_data():
    now = datetime.utcnow()

    async with AsyncSessionLocal() as db:
        await clear_demo_data(db)

        created_services = []

        for service_data in DEMO_SERVICES:
            service = Service(
                name=service_data["name"],
                base_url=service_data["base_url"],
                status=service_data["status"],
            )
            db.add(service)
            await db.flush()
            created_services.append((service, service_data))

            db.add(
                AlertRule(
                    service_id=service.id,
                    warning_response_time_ms=500.0,
                    critical_response_time_ms=1000.0,
                    enabled=True,
                )
            )

            for index, response_time in enumerate(
                service_data["response_times"]
            ):
                timestamp = now - timedelta(
                    minutes=45 - (index * 5)
                )
                db.add(
                    Metric(
                        service_id=service.id,
                        metric_type="response_time",
                        value=float(response_time),
                        timestamp=timestamp,
                    )
                )
                db.add(
                    Metric(
                        service_id=service.id,
                        metric_type="availability",
                        value=float(service_data["availability"]),
                        timestamp=timestamp,
                    )
                )
                db.add(
                    HealthCheck(
                        service_id=service.id,
                        status_code=(
                            200
                            if service_data["status"] != "critical"
                            else 503
                        ),
                        response_time=float(response_time),
                        success=service_data["status"] != "critical",
                        timestamp=timestamp,
                    )
                )

        log_messages = [
            (
                "Checkout API",
                "info",
                "Health check completed in 168ms",
            ),
            (
                "Payments Gateway",
                "warning",
                "Latency crossed warning threshold at 492ms",
            ),
            (
                "Orders Worker",
                "error",
                "Critical latency detected; incident opened",
            ),
            (
                "Notifications",
                "info",
                "Service recovered to healthy state",
            ),
        ]

        service_by_name = {
            service.name: service for service, _ in created_services
        }

        for offset, (service_name, level, message) in enumerate(
            log_messages
        ):
            db.add(
                Log(
                    service_id=service_by_name[service_name].id,
                    level=level,
                    message=message,
                    timestamp=now - timedelta(minutes=offset * 3),
                )
            )

        incident = Incident(
            service_id=service_by_name["Orders Worker"].id,
            severity="critical",
            title="Orders Worker latency is critical",
            description=(
                "Response time exceeded 1000ms during the latest "
                "monitoring window."
            ),
            status="open",
            started_at=now - timedelta(minutes=18),
        )
        db.add(incident)
        await db.flush()

        db.add(
            AIInsight(
                incident_id=incident.id,
                summary=(
                    "Orders processing is degraded and customer-facing "
                    "checkout may be delayed."
                ),
                root_cause=(
                    "The likely cause is queue pressure or a slow "
                    "downstream dependency. Check worker throughput and "
                    "recent deploy activity first."
                ),
                created_at=now - timedelta(minutes=12),
            )
        )

        await db.commit()


if __name__ == "__main__":
    asyncio.run(seed_demo_data())
