from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "extra": "ignore"}

    # Database
    database_url: str = "sqlite+aiosqlite:///tavera.db"

    # BC Government APIs
    orgbook_bc_api_url: str = "https://orgbook.gov.bc.ca/api/v4"
    fraser_health_api_url: str = ""
    vch_api_url: str = ""

    # External API timeout (seconds)
    external_api_timeout: int = 30
    external_api_retries: int = 3

    # Webhooks
    webhook_signing_secret: str = ""
    webhook_max_retries: int = 3

    # CSV import limits
    csv_max_rows: int = 5000
    csv_max_size_mb: int = 10

    # Scoring
    scoring_staleness_hours: int = 24

    # Sentry
    sentry_dsn: str = ""

    # CORS
    cors_origins: list[str] = ["http://localhost:5173"]


settings = Settings()
