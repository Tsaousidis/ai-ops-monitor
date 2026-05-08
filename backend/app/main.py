from fastapi import FastAPI

from app.api.router import api_router

from app.api.websocket import (
    router as websocket_router,
)

app = FastAPI(
    title="AI Ops Monitor",
)

app.include_router(api_router)

app.include_router(websocket_router)


@app.get("/")
async def root():
    return {
        "message": "AI Ops Monitor API"
    }