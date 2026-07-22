from fastapi import APIRouter

from domains.billing.router import router as billing_router

router = APIRouter(prefix="/api/v1")
router.include_router(billing_router)
