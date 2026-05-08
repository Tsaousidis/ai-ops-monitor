from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router

from app.api.websocket import (
    router as websocket_router,
)
from app.core.settings import settings

app = FastAPI(
    title="AI Ops Monitor",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

app.include_router(websocket_router)


@app.get("/")
async def root():
    return {
        "message": "AI Ops Monitor API"
    }
