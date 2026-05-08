from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db

from app.schemas.ai_insight import (
    AIInsightResponse,
)

from app.schemas.incident import (
    IncidentResponse,
)

from app.services.ai_insight_service import (
    generate_and_store_incident_insight,
    get_incident_insights,
)

from app.services.incident_service import (
    escalate_incident,
    get_all_incidents,
    get_incident_by_id,
    reopen_incident,
    resolve_incident,
)
from app.services.log_service import create_log
from app.websocket.websocket_manager import manager

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


async def _get_existing_incident(
    db: AsyncSession,
    incident_id: int,
):
    incident = await get_incident_by_id(
        db,
        incident_id,
    )

    if not incident:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    return incident


async def _broadcast_incident_update(incident):
    await manager.broadcast({
        "event": "incident_update",
        "data": {
            "id": incident.id,
            "service_id": incident.service_id,
            "severity": incident.severity,
            "title": incident.title,
            "status": incident.status,
        },
    })


async def _broadcast_log_update(log):
    await manager.broadcast({
        "event": "log_update",
        "data": {
            "id": log.id,
            "service_id": log.service_id,
            "level": log.level,
            "message": log.message,
            "timestamp": log.timestamp.isoformat(),
        },
    })


@router.post(
    "/{incident_id}/resolve",
    response_model=IncidentResponse,
)
async def resolve_existing_incident(
    incident_id: int,
    db: AsyncSession = Depends(get_db),
):
    incident = await _get_existing_incident(
        db,
        incident_id,
    )

    resolved_incident = await resolve_incident(
        db,
        incident,
    )

    log = await create_log(
        db=db,
        service_id=resolved_incident.service_id,
        level="info",
        message=(
            f"Incident #{resolved_incident.id} resolved manually"
        ),
    )
    await db.commit()
    await _broadcast_incident_update(resolved_incident)
    await _broadcast_log_update(log)

    return resolved_incident


@router.post(
    "/{incident_id}/reopen",
    response_model=IncidentResponse,
)
async def reopen_existing_incident(
    incident_id: int,
    db: AsyncSession = Depends(get_db),
):
    incident = await _get_existing_incident(
        db,
        incident_id,
    )

    reopened_incident = await reopen_incident(
        db,
        incident,
    )

    log = await create_log(
        db=db,
        service_id=reopened_incident.service_id,
        level="warning",
        message=(
            f"Incident #{reopened_incident.id} reopened manually"
        ),
    )
    await db.commit()
    await _broadcast_incident_update(reopened_incident)
    await _broadcast_log_update(log)

    return reopened_incident


@router.post(
    "/{incident_id}/escalate",
    response_model=IncidentResponse,
)
async def escalate_existing_incident(
    incident_id: int,
    db: AsyncSession = Depends(get_db),
):
    incident = await _get_existing_incident(
        db,
        incident_id,
    )

    escalated_incident = await escalate_incident(
        db,
        incident,
    )

    log = await create_log(
        db=db,
        service_id=escalated_incident.service_id,
        level="error",
        message=(
            f"Incident #{escalated_incident.id} escalated to critical"
        ),
    )
    await db.commit()
    await _broadcast_incident_update(escalated_incident)
    await _broadcast_log_update(log)

    return escalated_incident


@router.get(
    "/{incident_id}/ai-insights",
    response_model=list[AIInsightResponse],
)
async def list_incident_ai_insights(
    incident_id: int,
    db: AsyncSession = Depends(get_db),
):
    incident = await get_incident_by_id(
        db,
        incident_id,
    )

    if not incident:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    return await get_incident_insights(
        db,
        incident_id,
    )


@router.post(
    "/{incident_id}/ai-insights",
    response_model=AIInsightResponse,
)
async def create_incident_ai_insight(
    incident_id: int,
    db: AsyncSession = Depends(get_db),
):
    insight = await generate_and_store_incident_insight(
        db,
        incident_id,
    )

    if not insight:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    return insight


@router.post("/{incident_id}/ai-insights/queue")
async def queue_incident_ai_insight(
    incident_id: int,
    db: AsyncSession = Depends(get_db),
):
    incident = await get_incident_by_id(
        db,
        incident_id,
    )

    if not incident:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    from app.workers.tasks import (
        generate_incident_insight_task,
    )

    task = generate_incident_insight_task.delay(
        incident_id,
    )

    return {
        "task_id": task.id,
        "status": "queued",
    }
