from fastapi import APIRouter, Depends

from core.security import require_api_key
from domains.addresses.router import router as addresses_router
from domains.apps.router import public_router as apps_public_router
from domains.apps.router import router as apps_router
from domains.audit_events.router import router as audit_events_router
from domains.auth.router import router as auth_router
from domains.billing.router import router as billing_router
from domains.directory.router import router as directory_router
from domains.features.router import router as features_router
from domains.geo.router import router as geo_router
from domains.health.router import router as health_router
from domains.memberships.router import router as memberships_router
from domains.modules.router import router as modules_router
from domains.oauth.router import router as oauth_router
from domains.onboarding.router import router as onboarding_router
from domains.organizations.access import router as org_access_router
from domains.organizations.router import router as organizations_router
from domains.organizations.structure import router as org_structure_router
from domains.products.router import router as products_router
from domains.provisioning.router import router as provisioning_router
from domains.users.router import router as users_router

router = APIRouter()
protected_router = APIRouter(dependencies=[Depends(require_api_key)])

router.include_router(health_router)

# The OAuth/OIDC provider surface is public by spec: discovery, JWKS, /authorize,
# /token, /userinfo, and /introspect are reached directly by browsers and
# third-party servers that cannot present a first-party 876 API key. Each route
# enforces its own credential rules (client auth, PKCE, bearer tokens, or the
# internal key for first-party identity assertions) rather than require_api_key.
router.include_router(oauth_router)
router.include_router(apps_public_router)

# Geo reference data is public — no API key required (country/region/currency lists).
router.include_router(geo_router)

protected_router.include_router(addresses_router)
protected_router.include_router(audit_events_router)
protected_router.include_router(auth_router, prefix="/auth")
protected_router.include_router(directory_router)
protected_router.include_router(organizations_router)
protected_router.include_router(org_structure_router)
protected_router.include_router(org_access_router)
protected_router.include_router(memberships_router)
protected_router.include_router(modules_router)
protected_router.include_router(features_router)
protected_router.include_router(products_router)
protected_router.include_router(onboarding_router)
protected_router.include_router(provisioning_router)
protected_router.include_router(billing_router)
protected_router.include_router(apps_router)
protected_router.include_router(users_router)
router.include_router(protected_router)
