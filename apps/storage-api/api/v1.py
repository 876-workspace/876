from fastapi import APIRouter, Depends

from core.security import require_internal_key
from domains.files.router import router as files_router
from domains.quotas.router import router as quotas_router
from domains.uploads.router import router as uploads_router
from domains.usage.router import router as usage_router

router = APIRouter(prefix="/v1", dependencies=[Depends(require_internal_key)])
router.include_router(files_router)
router.include_router(uploads_router)
router.include_router(quotas_router)
router.include_router(usage_router)
