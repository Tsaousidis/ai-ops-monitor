from typing import Literal

from pydantic import ConfigDict
from pydantic import Field
from pydantic import field_validator
from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "AI Ops Monitor"
    APP_ENV: Literal[
        "local",
        "development",
        "staging",
        "production",
    ] = "development"
    DEBUG: bool = False
    LOG_SQL: bool = False

    DATABASE_URL: str = Field(min_length=1)
    REDIS_URL: str = "redis://localhost:6379/0"
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    CELERY_BROKER_URL: str | None = None
    CELERY_RESULT_BACKEND: str | None = None
    MONITORING_INTERVAL_SECONDS: int = Field(
        default=60,
        ge=10,
    )
    SECRET_KEY: str | None = None
    CORS_ORIGINS: str = (
        "http://localhost:3000,"
        "http://127.0.0.1:3000"
    )

    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @field_validator(
        "GEMINI_API_KEY",
        "CELERY_BROKER_URL",
        "CELERY_RESULT_BACKEND",
        "SECRET_KEY",
        mode="before",
    )
    @classmethod
    def empty_string_to_none(cls, value):
        if isinstance(value, str) and not value.strip():
            return None

        return value

    @model_validator(mode="after")
    def validate_deployment_settings(self):
        if self.APP_ENV != "production":
            return self

        if self.DEBUG:
            raise ValueError(
                "DEBUG must be false when APP_ENV=production"
            )

        if not self.SECRET_KEY or len(self.SECRET_KEY) < 32:
            raise ValueError(
                "SECRET_KEY must be at least 32 characters "
                "when APP_ENV=production"
            )

        if not self.cors_origins:
            raise ValueError(
                "CORS_ORIGINS must include at least one origin "
                "when APP_ENV=production"
            )

        localhost_origins = [
            origin
            for origin in self.cors_origins
            if "localhost" in origin or "127.0.0.1" in origin
        ]

        if localhost_origins:
            raise ValueError(
                "CORS_ORIGINS must not include localhost origins "
                "when APP_ENV=production"
            )

        return self

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

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
        )

    @property
    def celery_result_backend(self) -> str:
        return (
            self.CELERY_RESULT_BACKEND
            or self.REDIS_URL
        )


settings = Settings()
