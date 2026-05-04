from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings

logger = structlog.get_logger()

engine = create_async_engine(settings.database_url, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("tavera starting", database_url=settings.database_url[:50])
    yield
    await engine.dispose()
    logger.info("tavera stopped")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Tavera",
        description="Supplier Risk Intelligence API",
        version="0.1.0",
        lifespan=lifespan,
    )

    from app.routes.suppliers import router as supplier_router
    from app.routes.alerts import router as alert_router

    app.include_router(supplier_router, prefix="/api/v1")
    app.include_router(alert_router, prefix="/api/v1")

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return app
