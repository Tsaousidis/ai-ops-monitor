from datetime import datetime

from pydantic import BaseModel


class LogResponse(BaseModel):
    id: int
    service_id: int
    level: str
    message: str
    timestamp: datetime

    model_config = {
        "from_attributes": True
    }
