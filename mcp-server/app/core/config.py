from typing import List, Union, Literal
from pydantic import AnyHttpUrl, field_validator, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "MCP Payment Server"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: Literal["dev", "prod"] = "dev"
    
    # Circle SDK & Payments
    CIRCLE_API_KEY: SecretStr | None = None
    ENTITY_SECRET: SecretStr | None = None
    
    # OmniAgentPay Config
    OMNIAGENTPAY_WEBHOOK_SECRET: SecretStr | None = None
    OMNIAGENTPAY_MERCHANT_ID: str | None = None
    
    # Guard Policies
    OMNIAGENTPAY_DAILY_BUDGET: float = 1000.0
    OMNIAGENTPAY_HOURLY_BUDGET: float = 200.0
    OMNIAGENTPAY_TX_LIMIT: float = 500.0
    OMNIAGENTPAY_RATE_LIMIT_PER_MIN: int = 5
    OMNIAGENTPAY_WHITELISTED_RECIPIENTS: List[str] = []

    @field_validator("CIRCLE_API_KEY", "ENTITY_SECRET")
    @classmethod
    def validate_payment_secrets(cls, v: SecretStr | None, info: any) -> SecretStr | None:
        if info.data.get("ENVIRONMENT") == "prod" and not v:
            raise ValueError(f"Missing payment secret: {info.field_name}")
        return v

    # Security
    SECRET_KEY: str = "secret"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8

    # CORS
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    model_config = SettingsConfigDict(
        case_sensitive=True, env_file=".env", extra="ignore"
    )

settings = Settings()

