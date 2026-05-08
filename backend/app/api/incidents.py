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
    get_all_incidents,
    get_incident_by_id,
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
