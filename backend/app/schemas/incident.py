from datetime import datetime

from pydantic import BaseModel


class IncidentResponse(BaseModel):
    id: int
    service_id: int
    severity: str
    title: str
    description: str
    status: str
    started_at: datetime
    resolved_at: datetime | None

    model_config = {
        "from_attributes": True
    }