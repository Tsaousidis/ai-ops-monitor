from datetime import datetime

from pydantic import BaseModel


class MetricResponse(BaseModel):
    id: int
    service_id: int
    metric_type: str
    value: float
    timestamp: datetime

    model_config = {
        "from_attributes": True
    }