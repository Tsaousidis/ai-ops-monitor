from fastapi import APIRouter

from app.api.alert_rules import (
    router as alert_rules_router,
)

from app.api.health import router as health_router

from app.api.incidents import (
    router as incidents_router,
)

from app.api.metrics import (
    router as metrics_router,
)

from app.api.logs import (
    router as logs_router,
)

from app.api.monitoring import (
    router as monitoring_router,
)

from app.api.services import (
    router as services_router,
)

api_router = APIRouter()

api_router.include_router(health_router)

api_router.include_router(services_router)

api_router.include_router(monitoring_router)

api_router.include_router(incidents_router)

api_router.include_router(metrics_router)

api_router.include_router(logs_router)

api_router.include_router(alert_rules_router)
