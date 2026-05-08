from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str | None = "redis://localhost:6379/0"
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    CELERY_BROKER_URL: str | None = None
    CELERY_RESULT_BACKEND: str | None = None
    MONITORING_INTERVAL_SECONDS: int = 60
    CORS_ORIGINS: str = (
        "http://localhost:3000,"
        "http://127.0.0.1:3000"
    )

    model_config = ConfigDict(
        env_file=".env",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]

    @property
    def celery_broker_url(self) -> str:
        return (
            self.CELERY_BROKER_URL
            or self.REDIS_URL
            or "redis://localhost:6379/0"
        )

    @property
    def celery_result_backend(self) -> str:
        return (
            self.CELERY_RESULT_BACKEND
            or self.REDIS_URL
            or "redis://localhost:6379/0"
        )


settings = Settings()
