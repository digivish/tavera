import hashlib
import structlog
from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import get_db
from app.models import ApiKey

logger = structlog.get_logger()


def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


async def verify_api_key(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> ApiKey:
    """FastAPI dependency: extract X-API-Key header and verify against DB."""
    key = request.headers.get("X-API-Key")
    if not key:
        raise HTTPException(status_code=401, detail="X-API-Key header required")

    key_hash = _hash_key(key)

    result = await db.execute(
        select(ApiKey).where(
            ApiKey.key_hash == key_hash,
            ApiKey.is_active == True,
        )
    )
    api_key = result.scalar_one_or_none()

    if api_key is None:
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")

    logger.debug("api_key_verified", prefix=api_key.key_prefix, scopes=api_key.scopes)
    return api_key


def generate_api_key() -> tuple[str, str, str]:
    """Generate a new API key. Returns (raw_key, key_hash, key_prefix)."""
    import secrets
    raw = "tavera_" + secrets.token_urlsafe(32)
    return raw, _hash_key(raw), raw[:12]
