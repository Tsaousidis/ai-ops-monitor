from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting AI Ops Monitor API")
    yield
    print("Shutting down AI Ops Monitor API")


app = FastAPI(
    title="AI Ops Monitor API",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "message": "AI Ops Monitor API is running"
    }