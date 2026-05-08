from datetime import datetime

from pydantic import BaseModel


class AIInsightResponse(BaseModel):
    id: int
    incident_id: int
    summary: str
    root_cause: str
    created_at: datetime

    model_config = {
        "from_attributes": True
    }
