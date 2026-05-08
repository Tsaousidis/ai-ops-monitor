from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
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


settings = Settings()
