from datetime import datetime

from pydantic import BaseModel


class AlertRuleUpdate(BaseModel):
    warning_response_time_ms: float
    critical_response_time_ms: float
    enabled: bool = True


class AlertRuleResponse(BaseModel):
    id: int
    service_id: int
    warning_response_time_ms: float
    critical_response_time_ms: float
    enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }
