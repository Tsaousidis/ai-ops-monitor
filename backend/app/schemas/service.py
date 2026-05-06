from datetime import datetime

from pydantic import BaseModel


class ServiceCreate(BaseModel):
    name: str
    base_url: str


class ServiceResponse(BaseModel):
    id: int
    name: str
    base_url: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }