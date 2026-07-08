# backend/config.py
"""Application configuration using Pydantic Settings."""

from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Nexus Chronicle API"
    DEBUG: bool = False
    VERSION: str = "0.1.0"

    # Database
    DATABASE_URL: str = "sqlite:///./nexus_chronicle.db"

    # Security
    JWT_SECRET_KEY: str = Field(..., min_length=32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # CORS
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()