# 876 Platform — API Architecture & Communication Patterns

> **Audience**: Engineers working across the 876 monorepo. This document exhaustively catalogs the existing API backend patterns, SDK client surfaces, and frontend communication flows so new implementations follow the same design conventions.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [API Backend (FastAPI) Structure](#2-api-backend-fastapi-structure)
3. [Route Organization & Mounting](#3-route-organization--mounting)
4. [OpenAPI Documentation Attachment Pattern](#4-openapi-documentation-attachment-pattern)
5. [Authentication & Authorization Layers](#5-authentication--authorization-layers)
6. [Schema / Contract Pattern (Pydantic Models)](#6-schema--contract-pattern-pydantic-models)
7. [Error Envelope Contract](#7-error-envelope-contract)
8. [Repository Pattern](#8-repository-pattern)
9. [API Route Catalog — Complete by Domain](#9-api-route-catalog--complete-by-domain)
10. [Package Architecture — Tiered Client System](#10-package-architecture--tiered-client-system)
11. [`@876/admin` — Admin Client Surface](#11-876-admin--admin-client-surface)
12. [`@876/sdk` — Consumer SDK Client Surface](#12-876-sdk--consumer-sdk-client-surface)
13. [Zod Schema & Type Definition Patterns](#13-zod-schema--type-definition-patterns)
14. [Core Transport Layer (`@876/core/client`)](#14-core-transport-layer-876coreclient)
15. [Console App Communication Patterns](#15-console-app-communication-patterns)
16. [Complete Data Flow Walkthrough](#16-complete-data-flow-walkthrough)
17. [Stripe-Style API Contract Conventions](#17-stripe-style-api-contract-conventions)

---

## 1. High-Level Architecture

```
┌──────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
│    @876/app          │      │  @876/console         │      │  @876/docs            │
│  (Next.js, port 3000)│      │  (Next.js, port 3002) │      │  (Next.js, port 3003) │
│  Consumer-facing app │      │  Internal Console     │      │  SDK docs app         │
└──────────┬───────────┘      └──────────┬────────────┘      └──────────────────────┘
           │                             │
           │ @876/sdk                    │ @876/admin
           │ (consumer/auth tier)        │ (internal-key tier)
           ▼                             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         @876/api (FastAPI, port 4000)                        │
│                                                                              │
│  main.py → api/v1.py → domain routers (users, orgs, apps, auth, oauth, ...) │
│                                                                              │
│  Auth layers: ApiKeyDep → SessionDep → AdminDep (layered)                    │
│  DB: SQLAlchemy async + repositories                                        │
│  External: WorkOS (auth), PostHog (features/analytics), Stripe (billing)      │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Key design rule**: Next.js apps never contain raw `fetch` calls to FastAPI. All communication goes through `@876/sdk` (consumer) or `@876/admin` (console). The SDK and admin packages are the only authorized API clients.

---

## 2. API Backend (FastAPI) Structure

```
apps/api/
├── main.py                         # FastAPI app factory, lifespan, seeding
├── api/v1.py                       # Central wiring — mounts ALL domain routers
│
├── core/
│   ├── config.py                   # Pydantic Settings (env-based configuration)
│   ├── openapi.py                  # OpenAPI metadata, tags, schema customizer
│   ├── security.py                 # Principal, ApiKeyDep, SessionDep, AdminDep
│   ├── session.py                  # Session cookie seal/unseal (HMAC-SHA256)
│   ├── responses.py                # ErrorEnvelope, ListObject[T] generic models
│   ├── errors.py                   # AppHTTPException
│   └── id.py, timestamps.py, deletion.py, logging.py ...
│
├── db/
│   ├── session.py                  # Async engine factory, get_db(), lifespan
│   ├── models/
│   │   ├── base.py                 # DeclarativeBase
│   │   ├── users.py, orgs.py, auth.py, apps.py, ...
│   │   └── products.py, prices.py, subscriptions.py, ...
│   └── repositories/
│       ├── base.py                 # BaseRepository with cursor_paginate helpers
│       ├── users.py, organizations.py, apps.py, ...
│       └── (one per domain model, same CRUD pattern)
│
├── domains/
│   ├── health/                     # GET /health
│   ├── auth/                       # login, register, OTP, session, OAuth session
│   ├── oauth/                      # OAuth 2.0 + OIDC provider endpoints
│   ├── users/                      # User CRUD, profiles, addresses, contacts, features
│   ├── organizations/              # Org CRUD, roles, members, locations, departments
│   ├── memberships/                # Membership CRUD
│   ├── apps/                       # OAuth app registration, API keys
│   ├── features/                   # Feature flags (PostHog-backed)
│   ├── products/                   # Product catalog & prices
│   ├── billing/                    # Billing accounts, subscriptions, Stripe
│   ├── addresses/                  # Address CRUD (standalone)
│   ├── directory/                  # Jamaica reference directory (banks, schools, gov)
│   ├── geo/                        # Countries, currencies, regions
│   ├── audit_events/               # Client telemetry
│   └── ...each has:
│       ├── router.py               # Route definitions
│       ├── schemas.py              # Pydantic request/response models
│       └── docs.py                 # OpenAPI description constants
│
├── services/
│   ├── auth.py                     # AuthService (WorkOS integration)
│   └── provisioning.py             # Org provisioning helpers
│
├── providers/
│   ├── protocol.py                 # Abstract interfaces
│   ├── workos/                     # WorkOS adapter, client, types, JWKS
│   └── posthog/                    # Feature flag provider client
│
├── schemas/                        # Shared Pydantic models (sessions, api_keys)
├── utils/                          # security_helpers.py, email.py
├── scripts/                        # Seed, migration, admin scripts
└── tests/                          # Pytest test suite
```

### Every Domain Package Contains Three Files

| File         | Purpose                                                     |
| ------------ | ----------------------------------------------------------- |
| `router.py`  | Route handler functions with FastAPI decorators             |
| `schemas.py` | Pydantic request body models and response models            |
| `docs.py`    | OpenAPI `summary`, `description`, and `responses` constants |

This three-file-per-domain pattern keeps concerns separated: schemas own data shape, docs own API surface documentation, and routers own business logic.

---

## 3. Route Organization & Mounting

### `main.py` → `api/v1.py` → Domain Routers

**`main.py`** creates the FastAPI app and includes the single `api_router`:

```python
app.include_router(api_router)
setup_openapi(app)
```

**`api/v1.py`** defines **two** top-level routers — one public, one protected:

| Router             | Dependency                 | Purpose                                       |
| ------------------ | -------------------------- | --------------------------------------------- |
| `router` (public)  | None                       | Health, OAuth discovery, geo, public app info |
| `protected_router` | `Depends(require_api_key)` | All other domain routes                       |

```python
router = APIRouter()
protected_router = APIRouter(dependencies=[Depends(require_api_key)])

# Public routes (no API key required)
router.include_router(health_router)
router.include_router(oauth_router)
router.include_router(apps_public_router)
router.include_router(geo_router)

# Protected routes (require API key + additional auth)
protected_router.include_router(addresses_router)
protected_router.include_router(auth_router, prefix="/auth")
protected_router.include_router(users_router, prefix="/users")
protected_router.include_router(organizations_router, prefix="/organizations")
protected_router.include_router(memberships_router, prefix="/memberships")
protected_router.include_router(products_router, prefix="/products")
protected_router.include_router(features_router, prefix="/features")
protected_router.include_router(apps_router, prefix="/apps")
protected_router.include_router(billing_router, prefix="/billing")
protected_router.include_router(directory_router, prefix="/directory")
protected_router.include_router(audit_events_router, prefix="/audit-events")
# ... and more

# Mount protected under public
router.include_router(protected_router)
```

The **API key** (`X-876-API-Key` / `X-Api-Key` / `Bearer 876_app_secret_...`) is the first gate. Individual routes then layer their own security via dependency injection (`SessionDep`, `AdminDep`, `ConsumerSessionDep`).

---

## 4. OpenAPI Documentation Attachment Pattern

OpenAPI documentation is a **first-class concern** with a dedicated system. It has two levels:

### Global Level — `core/openapi.py`

Defines tag metadata and the custom operation ID function:

```python
TAGS_METADATA = [
    {"name": "Auth", "description": "Password, magic-OTP, social login, ..."},
    {"name": "Users", "description": "User resource management, feature-flag grants, ..."},
    {"name": "Organizations", "description": "Organization CRUD and nested membership management."},
    {"name": "Memberships", "description": "Membership CRUD — user ↔ organization relationships."},
    {"name": "Features", "description": "Platform feature-flag registry synced from WorkOS."},
    {"name": "Registered Apps", "description": "OAuth application registration — create and list third-party apps."},
    {"name": "System", "description": "Health and liveness checks."},
    # ... 9 total tags
]
```

**Custom operation IDs** make OpenAPI-generated client methods human-readable:

```python
def custom_generate_unique_id(route):
    tag = route.tags[0].lower().replace(" ", "_") if route.tags else "default"
    return f"{tag}-{route.name}"
```

Produces IDs like: `auth-login`, `users-retrieve_user`, `organizations-list_organizations`.

**`setup_openapi()`** replaces FastAPI's auto-generated schema:

```python
def setup_openapi(app):
    def custom_openapi():
        schema = get_openapi(title=app.title, version=app.version,
                             routes=app.routes, tags=TAGS_METADATA)
        schema.setdefault("servers",
            [{"url": "http://localhost:4000", "description": "Local dev"}])
        return schema
    app.openapi = custom_openapi
```

### Route Level — per-domain `docs.py`

Every domain has a `docs.py` module that exports string constants. These are **purely for OpenAPI schema enrichment** — they do not affect runtime behavior.

**Example `domains/users/docs.py`** exports per-route constants:

```python
LIST_USERS_SUMMARY = "List users"
LIST_USERS_DESCRIPTION = """
Returns a paginated list of all users. **Admin only** (requires `X-Internal-Key`).
"""
LIST_USERS_RESPONSES = {
    status.HTTP_401_UNAUTHORIZED: {"model": ErrorEnvelope, "description": "Missing or invalid internal key."},
    status.HTTP_403_FORBIDDEN: {"model": ErrorEnvelope, "description": "Caller is not an admin."},
}

RETRIEVE_USER_SUMMARY = "Retrieve user"
RETRIEVE_USER_DESCRIPTION = "Returns a single user by ID. **Admin only** (requires `X-Internal-Key`)."
RETRIEVE_USER_RESPONSES = {
    status.HTTP_401_UNAUTHORIZED: {...},
    status.HTTP_403_FORBIDDEN: {...},
    status.HTTP_404_NOT_FOUND: {"model": ErrorEnvelope, "description": "No user found with this ID."},
}

CREATE_USER_SUMMARY = "Create user"
CREATE_USER_DESCRIPTION = "Creates a user. **Admin only**."
CREATE_USER_RESPONSES = {
    status.HTTP_409_CONFLICT: {"model": ErrorEnvelope, "description": "Email or provider identity already exists."},
}

UPDATE_USER_SUMMARY = "Update user"
UPDATE_USER_DESCRIPTION = "Updates a user's editable profile and platform fields. **Admin only**."
UPDATE_USER_RESPONSES = {
    status.HTTP_404_NOT_FOUND: {"model": ErrorEnvelope, "description": "No user found with this ID."},
}

DELETE_USER_SUMMARY = "Delete user"
DELETE_USER_DESCRIPTION = "Deletes a user. Returns a deletion tombstone. **Admin only**."
DELETE_USER_RESPONSES = {
    status.HTTP_404_NOT_FOUND: {"model": ErrorEnvelope, "description": "No user found with this ID."},
}

SEARCH_USERS_SUMMARY = "Search users"
SEARCH_USERS_DESCRIPTION = "Searches users by email, username, or name. **Admin only**."
SEARCH_USERS_RESPONSES = {}
```

### How docs.py integrates with the router

The router imports docs constants and uses them as FastAPI decorator parameters:

```python
from . import docs

@router.get(
    "",
    response_model=ListObject[UserResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_USERS_SUMMARY,
    description=docs.LIST_USERS_DESCRIPTION,
    responses=docs.LIST_USERS_RESPONSES,
)
async def list_users(_admin: AdminDep, db: Annotated[AsyncSession, Depends(get_db)], ...):
    ...
```

**Router decorator pattern for a complete CRUD endpoint:**

```python
@router.get(                                       # HTTP method + path
    "/{user_id}",                                  # Path param
    response_model=UserResponse,                   # Response model
    status_code=status.HTTP_200_OK,                # Success HTTP code
    summary=docs.RETRIEVE_USER_SUMMARY,            # From docs.py
    description=docs.RETRIEVE_USER_DESCRIPTION,    # From docs.py
    responses=docs.RETRIEVE_USER_RESPONSES,        # Error responses from docs.py
)
async def retrieve_user(                           # Handler function name = operation ID suffix
    user_id: str,                                  # Path parameter
    _admin: AdminDep,                              # Auth dependency (prefixed with _ when unused)
    db: Annotated[AsyncSession, Depends(get_db)],  # DB session
    include_deleted: bool = False,                 # Query parameter
) -> UserResponse:                                 # Return type annotation
    ...
```

---

## 5. Authentication & Authorization Layers

Defined in **`core/security.py`** — a layered auth system with typed dependency aliases.

### Dependency Resolution Chain

```
Incoming Request Headers
      │
      ▼
resolve_api_key()          ← reads X-876-API-Key, X-Api-Key, or Bearer 876_app_secret_*
resolve_bearer_token()     ← reads Authorization: Bearer <jwt>
resolve_internal_key()     ← reads X-Internal-Key header
      │
      ▼
resolve_principal()        ← combines all above into a Principal dataclass
      │
      ▼
require_api_key()          ← validates hash, checks revoked/expired → sets request.state
require_session()          ← requires user_id in Principal (from bearer token)
require_admin()            ← requires internal=True in Principal
```

### The Principal Dataclass

```python
@dataclass
class Principal:
    user_id: str | None = None       # OAuth bearer subject
    app_id: str | None = None        # OAuth audience (client ID)
    api_key_id: str | None = None    # API key record ID
    internal: bool = False           # X-Internal-Key authenticated = super-admin
    realm: str = "consumer"         # "consumer" | "enterprise" from JWT claims
    org_id: str | None = None
    cross_realm: bool = False
```

### Typed Dependency Aliases

| Alias                  | Type                                                        | Auth Required                                   | Who Can Use                |
| ---------------------- | ----------------------------------------------------------- | ----------------------------------------------- | -------------------------- |
| `ApiKeyDep`            | `Annotated[bool, Depends(require_api_key)]`                 | Valid SHA-256-hashed `876_app_secret_*` key     | Any registered app         |
| `SessionDep`           | `Annotated[Principal, Depends(require_session)]`            | Valid bearer JWT (access token) or internal key | Authenticated user         |
| `ConsumerSessionDep`   | `Annotated[Principal, Depends(require_consumer_session)]`   | Session + `realm="consumer"`                    | Consumer users             |
| `EnterpriseSessionDep` | `Annotated[Principal, Depends(require_enterprise_session)]` | Session + `realm="enterprise"`                  | Enterprise users           |
| `AdminDep`             | `Annotated[Principal, Depends(require_admin)]`              | Internal key only (`X-Internal-Key`)            | Server-to-server (Console) |

**Route signature examples:**

```python
# Public (no auth)
async def health_check(): ...

# API key required
async def list_apps(_api_key: ApiKeyDep, ...): ...

# Session required
async def retrieve_my_profile(principal: SessionDep, ...): ...

# Admin only (internal key)
async def list_users(_admin: AdminDep, ...): ...

# Session + consumer realm
async def consumer_resource(principal: ConsumerSessionDep, ...): ...
```

---

## 6. Schema / Contract Pattern (Pydantic Models)

Every domain has a **`schemas.py`** with a consistent pattern:

### Response Models — `ConfigDict(from_attributes=True)`

Maps directly from SQLAlchemy ORM rows. Object type discriminator is set via `Literal`:

```python
class UserResponse(UserBase):
    object: Literal["user"] = Field(default="user", description="Always 'user'.")
    id: str = Field(description="Unique identifier.", examples=["usr_01HFNPGM9K..."])
    company: str | None = None
    email: str
    first_name: str
    last_name: str
    created_at: int
    updated_at: int
    deleted_at: int | None = None
    deleted_by: str | None = None
    deletion_reason: str | None = None

    model_config = ConfigDict(from_attributes=True)
```

### Create Request Models — camelCase aliases with `populate_by_name=True`

```python
class ConsumerAddressCreate(BaseModel):
    type: Literal["billing", "shipping", "home", "work", "other"] = Field(default="other")
    label: str | None = None
    line1: str | None = None
    city: str | None = None
    region_id: str | None = Field(default=None, alias="regionId")
    country_code: str | None = Field(default=None, alias="countryCode")
    postal_code: str | None = Field(default=None, alias="postalCode")
    is_default: bool = Field(default=False, alias="isDefault")

    model_config = ConfigDict(populate_by_name=True)
```

### Update Request Models — Partial subsets

```python
class UserUpdate(BaseModel):
    email: str | None = None
    username: str | None = Field(default=None, description="Set to null to clear it.")
    first_name: str | None = None
    last_name: str | None = None
    avatar: str | None = Field(default=None, description="Set to null to clear it.")
    status: str | None = None
```

### Delete Response — Tombstone pattern

```python
class UserDeleteResponse(BaseModel):
    object: Literal["user"] = "user"
    id: str
    deleted: bool = True
```

### Generic List Response — `ListObject[T]` in `core/responses.py`

```python
class ListObject(BaseModel, Generic[T]):
    object: str = "list"
    data: list[T]
    has_more: bool
    url: str
    total_count: int | None = None
```

### Special Response Variations

- **Create endpoints**: sometimes return a subclass with extra fields (e.g., `AppCreatedResponse` adds `client_secret`)
- **Auth endpoints**: return union types (`AuthSessionResponse | AuthEventResponse`)
- **Ensure endpoints**: return stripped-down responses with no admin-only fields

---

## 7. Error Envelope Contract

Two error handler tiers:

### `AppHTTPException` (application errors)

Raised in route handlers with a machine-readable code and HTTP status:

```python
raise AppHTTPException(
    code="user/not-found",
    message="No user exists with the provided identifier.",
    http_status_code=status.HTTP_404_NOT_FOUND,
)
```

### `RequestValidationError` (Pydantic validation)

Auto-generated for invalid request bodies.

### Error Response Shape

Every error returns:

```json
{
  "error": {
    "code": "auth/no-session",
    "message": "No active session."
  }
}
```

### `ErrorEnvelope` / `ErrorDetail` Models

```python
class ErrorDetail(BaseModel):
    code: str = Field(description="Machine-readable error code, e.g. 'auth/not-found'.")
    message: str = Field(description="Human-readable error message.")

class ErrorEnvelope(BaseModel):
    error: ErrorDetail
```

Error **code** values follow a `domain/problem` naming convention:

- `auth/no-session`, `auth/forbidden`, `auth/invalid-token`
- `user/not-found`, `user/duplicate-email`
- `api-key/missing`, `api-key/invalid`, `api-key/expired`
- `address/not-found`
- `contact/already-exists`, `contact/self-contact`
- `feature/not-found`, `feature/scope-mismatch`
- `provider/invalid-request`

---

## 8. Repository Pattern

### Base Repository — `db/repositories/base.py`

Every repository extends `BaseRepository`, which provides generic cursor-based pagination:

```python
class BaseRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def cursor_paginate(self, model, cursor_field, limit,
                               starting_after, ending_before) -> tuple[list, bool]:
        # Keyset pagination on created_at
```

### Concrete Repository Pattern

Each domain has its own repository extending `BaseRepository`:

| Method      | Pattern                                                      | Example (`UserRepository`)                  |
| ----------- | ------------------------------------------------------------ | ------------------------------------------- |
| `get_by_id` | `self.db.get(Model, id)`                                     | `get_by_id(user_id, include_deleted=False)` |
| `get_by_*`  | `select(Model).where(...)`                                   | `get_by_email(email)`                       |
| `create`    | `Model(**kwargs); db.add(); db.flush()`                      | `create(id, email, first_name, ...)`        |
| `update`    | `update(Model).where(...).values(**kwargs).returning(Model)` | `update(user_id, email=..., ...)`           |
| `delete`    | Soft-delete: `values(deleted_at=now)` or Hard: `delete(...)` | Uses `core/deletion.py` helpers             |

**Constructor injection** — all repositories accept `AsyncSession`:

```python
repo = UserRepository(db)  # where db is injected via Depends(get_db)
```

**Specialized methods** per domain:

- `UserRepository.search()`, `set_banned()`, `ensure_from_workos()`, `purge()`
- `OrganizationRepository.get_by_slug()`, `get_by_workos_id()`, `search()`
- `AppRepository.list_by_org()`, `list_all()`, `get_by_client_id()`

---

## 9. API Route Catalog — Complete by Domain

### Public Routes (No API Key Required)

| Prefix         | Route                                   | Summary             | Handler                |
| -------------- | --------------------------------------- | ------------------- | ---------------------- |
| `/health`      | `GET /health`                           | Health check        | `health_check`         |
| `/.well-known` | `GET /.well-known/openid-configuration` | OIDC discovery      | `openid_configuration` |
| `/.well-known` | `GET /.well-known/jwks.json`            | JWKS endpoint       | `jwks`                 |
| `/oauth`       | `GET /oauth/authorize`                  | OAuth authorization | `authorize`            |
| `/oauth`       | `POST /oauth/token`                     | Token exchange      | `token`                |
| `/oauth`       | `GET /oauth/userinfo`                   | User info           | `userinfo`             |
| `/oauth`       | `POST /oauth/revoke`                    | Token revocation    | `revoke`               |
| `/oauth`       | `POST /oauth/introspect`                | Token introspection | `introspect`           |
| `/oauth`       | `GET /oauth/end-session`                | End session         | `end_session`          |
| `/oauth`       | `GET /oauth/consent`                    | Consent UI          | `consent`              |
| `/oauth`       | `POST /oauth/consent/approve`           | Approve consent     | `approve_consent`      |
| `/oauth`       | `POST /oauth/consent/deny`              | Deny consent        | `deny_consent`         |
| `/apps`        | `GET /apps/public/{client_id}`          | Public app info     | `get_public_app`       |
| `/geo`         | `GET /geo/currencies`                   | List currencies     | `list_currencies`      |
| `/geo`         | `GET /geo/countries`                    | List countries      | `list_countries`       |
| `/geo`         | `GET /geo/countries/{code}/regions`     | List regions        | `list_regions`         |

### Protected Routes (API Key Required + Additional Auth)

#### Auth Domain (`/auth`)

| Route                               | Auth       | Summary                 |
| ----------------------------------- | ---------- | ----------------------- |
| `POST /auth/resolve`                | Public     | Resolve identity        |
| `POST /auth/login`                  | Public     | Password login          |
| `POST /auth/register`               | Public     | Register new user       |
| `POST /auth/register-business`      | Public     | Register business       |
| `POST /auth/social-login`           | Public     | Social login            |
| `GET /auth/providers`               | Public     | List auth providers     |
| `POST /auth/magic-otp/send`         | Public     | Send magic OTP          |
| `POST /auth/magic-otp/verify`       | Public     | Verify magic OTP        |
| `POST /auth/recover`                | Public     | Password recovery       |
| `POST /auth/reset-password`         | Public     | Reset password          |
| `POST /auth/verify-email`           | Public     | Verify email            |
| `POST /auth/callback`               | Public     | Auth callback           |
| `GET /auth/session`                 | SessionDep | Get current session     |
| `POST /auth/refresh`                | SessionDep | Refresh session         |
| `POST /auth/logout`                 | SessionDep | Logout                  |
| `POST /auth/sessions/switch`        | SessionDep | Switch account          |
| `POST /auth/sessions/{sid}/signout` | SessionDep | Sign out session        |
| `GET /auth/routing/memberships`     | SessionDep | Get routing memberships |
| `POST /auth/oauth/session`          | SessionDep | Create OAuth session    |

#### Users Domain (`/users`)

| Route                                        | Auth       | Summary                         |
| -------------------------------------------- | ---------- | ------------------------------- |
| `GET /users`                                 | AdminDep   | List users (paginated)          |
| `POST /users`                                | AdminDep   | Create user                     |
| `GET /users/search`                          | AdminDep   | Search users                    |
| `GET /users/by-username/{username}`          | AdminDep   | Retrieve by username            |
| `GET /users/by-workos-id/{id}`               | AdminDep   | Retrieve by WorkOS ID           |
| `POST /users/ensure`                         | ApiKeyDep  | Idempotently create/return user |
| `GET /users/username-availability`           | AdminDep   | Check username availability     |
| `GET /users/{id}`                            | AdminDep   | Retrieve user                   |
| `PATCH /users/{id}`                          | AdminDep   | Update user                     |
| `DELETE /users/{id}`                         | AdminDep   | Soft-delete user                |
| `DELETE /users/{id}/purge`                   | AdminDep   | Hard-delete user                |
| `POST /users/{id}/ban`                       | AdminDep   | Ban user                        |
| `POST /users/{id}/unban`                     | AdminDep   | Unban user                      |
| `POST /users/backfill-usernames`             | AdminDep   | Backfill usernames              |
| `GET /users/{id}/features`                   | AdminDep   | List user feature grants        |
| `POST /users/{id}/features`                  | AdminDep   | Grant user feature              |
| `DELETE /users/{id}/features/{fid}`          | AdminDep   | Disable user feature            |
| `GET /users/{id}/oauth-grants`               | SessionDep | List OAuth grants               |
| `POST /users/{id}/oauth-grants/{gid}/revoke` | SessionDep | Revoke OAuth grant              |
| `GET /users/{id}/apps`                       | AdminDep   | List user apps                  |
| `GET /users/{id}/accounts`                   | AdminDep   | List linked accounts            |
| `DELETE /users/{id}/accounts/{aid}`          | AdminDep   | Unlink account                  |
| `GET /users/{id}/profile`                    | AdminDep   | Retrieve user profile           |
| `POST /users/{id}/profile`                   | AdminDep   | Create user profile             |
| `PATCH /users/{id}/profile`                  | AdminDep   | Update user profile             |
| `DELETE /users/{id}/profile`                 | AdminDep   | Delete user profile             |
| `GET /users/{id}/addresses`                  | AdminDep   | List user addresses             |
| `POST /users/{id}/addresses`                 | AdminDep   | Create user address             |
| `GET /users/{id}/addresses/{aid}`            | AdminDep   | Retrieve user address           |
| `PATCH /users/{id}/addresses/{aid}`          | AdminDep   | Update user address             |
| `DELETE /users/{id}/addresses/{aid}`         | AdminDep   | Delete user address             |
| `GET /users/{id}/contacts`                   | AdminDep   | List user contacts              |
| `POST /users/{id}/contacts`                  | AdminDep   | Create user contact             |
| `GET /users/{id}/contacts/{cid}`             | AdminDep   | Retrieve user contact           |
| `PATCH /users/{id}/contacts/{cid}`           | AdminDep   | Update user contact             |
| `DELETE /users/{id}/contacts/{cid}`          | AdminDep   | Delete user contact             |
| `GET /users/{id}/sessions/revoke`            | AdminDep   | Revoke all sessions             |

#### Users Domain — Self-Scoped (SessionDep)

| Route                              | Auth       | Summary             |
| ---------------------------------- | ---------- | ------------------- |
| `GET /users/me/profile`            | SessionDep | Retrieve my profile |
| `PATCH /users/me/profile`          | SessionDep | Update my profile   |
| `GET /users/me/addresses`          | SessionDep | List my addresses   |
| `POST /users/me/addresses`         | SessionDep | Create my address   |
| `GET /users/me/addresses/{aid}`    | SessionDep | Retrieve my address |
| `PATCH /users/me/addresses/{aid}`  | SessionDep | Update my address   |
| `DELETE /users/me/addresses/{aid}` | SessionDep | Delete my address   |
| `GET /users/me/contacts`           | SessionDep | List my contacts    |
| `POST /users/me/contacts`          | SessionDep | Create my contact   |
| `GET /users/me/contacts/{cid}`     | SessionDep | Retrieve my contact |
| `PATCH /users/me/contacts/{cid}`   | SessionDep | Update my contact   |
| `DELETE /users/me/contacts/{cid}`  | SessionDep | Delete my contact   |
| `GET /users/me/memberships`        | SessionDep | List my memberships |

#### Users Domain — Reserved Usernames (AdminDep)

| Route                                  | Auth     | Summary                  |
| -------------------------------------- | -------- | ------------------------ |
| `GET /users/reserved-usernames`        | AdminDep | List reserved usernames  |
| `POST /users/reserved-usernames`       | AdminDep | Reserve a username       |
| `DELETE /users/reserved-usernames/{u}` | AdminDep | Remove reserved username |

#### Organizations Domain (`/organizations`)

| Route                                                 | Auth     | Summary                   |
| ----------------------------------------------------- | -------- | ------------------------- |
| `GET /organizations`                                  | AdminDep | List organizations        |
| `POST /organizations`                                 | AdminDep | Create organization       |
| `GET /organizations/search`                           | AdminDep | Search organizations      |
| `GET /organizations/{id}`                             | AdminDep | Retrieve organization     |
| `PATCH /organizations/{id}`                           | AdminDep | Update organization       |
| `DELETE /organizations/{id}`                          | AdminDep | Soft-delete organization  |
| `GET /organizations/{id}/purge`                       | AdminDep | Hard-delete organization  |
| `GET /organizations/by-slug/{slug}`                   | AdminDep | Retrieve by slug          |
| `GET /organizations/by-workos-id/{wid}`               | AdminDep | Retrieve by WorkOS ID     |
| `GET /organizations/{id}/memberships`                 | AdminDep | List org memberships      |
| `POST /organizations/{id}/memberships`                | AdminDep | Create org membership     |
| `GET /organizations/{id}/subscriptions`               | AdminDep | List org subscriptions    |
| `POST /organizations/{id}/subscriptions/provision`    | AdminDep | Provision subscription    |
| `PATCH /organizations/{id}/subscriptions/{sid}`       | AdminDep | Update subscription       |
| `DELETE /organizations/{id}/subscriptions/{sid}`      | AdminDep | Delete subscription       |
| `GET /organizations/{id}/invite-tokens`               | AdminDep | List invite tokens        |
| `POST /organizations/{id}/invite-tokens`              | AdminDep | Create invite token       |
| `POST /organizations/{id}/invite-tokens/{tid}/accept` | AdminDep | Accept invite             |
| `POST /organizations/{id}/setup`                      | AdminDep | Complete enrollment setup |

#### Organizations — Access Control

| Route                                              | Auth       | Summary                 |
| -------------------------------------------------- | ---------- | ----------------------- |
| `GET /organizations/permissions/catalog`           | SessionDep | List permission catalog |
| `GET /organizations/{id}/roles`                    | SessionDep | List org roles          |
| `POST /organizations/{id}/roles`                   | SessionDep | Create org role         |
| `GET /organizations/{id}/roles/{rid}`              | SessionDep | Retrieve role           |
| `PATCH /organizations/{id}/roles/{rid}`            | SessionDep | Update role             |
| `DELETE /organizations/{id}/roles/{rid}`           | SessionDep | Delete role             |
| `GET /organizations/{id}/members`                  | SessionDep | List org members        |
| `GET /organizations/{id}/members/me`               | SessionDep | Get my membership       |
| `PATCH /organizations/{id}/members/{mid}`          | SessionDep | Update member role      |
| `GET /organizations/{id}/app-assignments`          | SessionDep | List app assignments    |
| `POST /organizations/{id}/app-assignments`         | SessionDep | Create app assignment   |
| `DELETE /organizations/{id}/app-assignments/{aid}` | SessionDep | Revoke app assignment   |

#### Organizations — Structure (Locations, Contacts, Departments, Employees)

| Route                                        | Auth       | Summary           |
| -------------------------------------------- | ---------- | ----------------- |
| `GET /organizations/{id}/locations`          | SessionDep | List locations    |
| `POST /organizations/{id}/locations`         | SessionDep | Create location   |
| `GET /organizations/{id}/locations/{lid}`    | SessionDep | Retrieve location |
| `PATCH /organizations/{id}/locations/{lid}`  | SessionDep | Update location   |
| `DELETE /organizations/{id}/locations/{lid}` | SessionDep | Delete location   |
| `GET /organizations/{id}/contacts`           | SessionDep | List contacts     |
| `POST /organizations/{id}/contacts`          | SessionDep | Create contact    |
| ...                                          | ...        | ...               |
| `GET /organizations/{id}/departments`        | SessionDep | List departments  |
| ...                                          | ...        | ...               |
| `GET /organizations/{id}/employees`          | SessionDep | List employees    |
| ...                                          | ...        | ...               |

#### Apps Domain (`/apps`)

| Route                                      | Auth      | Summary                |
| ------------------------------------------ | --------- | ---------------------- |
| `GET /apps`                                | ApiKeyDep | List apps              |
| `POST /apps`                               | ApiKeyDep | Create app             |
| `GET /apps/current`                        | ApiKeyDep | Get current app        |
| `GET /apps/{id}`                           | ApiKeyDep | Retrieve app           |
| `PATCH /apps/{id}`                         | ApiKeyDep | Update app             |
| `DELETE /apps/{id}`                        | ApiKeyDep | Delete app             |
| `GET /apps/{id}/features`                  | ApiKeyDep | List app features      |
| `GET /apps/{id}/subscriptions`             | ApiKeyDep | List app subscriptions |
| `POST /apps/{id}/api-keys`                 | ApiKeyDep | Create API key         |
| `GET /apps/{id}/api-keys`                  | ApiKeyDep | List API keys          |
| `PATCH /apps/{id}/api-keys/{key_id}`       | ApiKeyDep | Update API key         |
| `POST /apps/{id}/api-keys/{key_id}/revoke` | ApiKeyDep | Revoke API key         |
| `DELETE /apps/{id}/api-keys/{key_id}`      | ApiKeyDep | Delete API key         |

#### Other Domains

| Domain       | Prefix          | Routes                                                                                              |
| ------------ | --------------- | --------------------------------------------------------------------------------------------------- |
| Memberships  | `/memberships`  | CRUD (GET list, POST create, GET/{id}, PATCH/{id}, DELETE/{id})                                     |
| Features     | `/features`     | CRUD + user-level grant/revoke                                                                      |
| Products     | `/products`     | CRUD + nested price management                                                                      |
| Billing      | `/billing`      | Billing accounts CRUD, subscriptions CRUD, subscription items CRUD                                  |
| Addresses    | `/addresses`    | Standalone CRUD                                                                                     |
| Directory    | `/directory`    | Banks, bank branches, credit unions, ministries, universities, schools — CRUD for each (~50 routes) |
| Audit Events | `/audit-events` | POST create, GET list                                                                               |

---

## 10. Package Architecture — Tiered Client System

```
@876/core/client              ← Shared transport, base URL, types (thinnest layer)
     ↙                                    ↘
@876/sdk                          @876/admin
(consumer-facing,                  (internal/admin-only,
 auth/session tier)                 internal-key tier)
- Zod runtime validation           - Plain TypeScript types
- Client-side safe                 - server-only guard
- Public API key headers           - Internal key + API key headers
- Self-scoped routes               - Platform-wide CRUD
```

### Key Design Principles

1. **Surface = exactly the factories composed** — each client factory creates one runtime and composes only the resource factories it needs. Admin-only operations never exist in consumer packages, so they cannot accidentally bundle.

2. **`server-only` guard** — `@876/admin`'s entry file starts with `import 'server-only'`, making any Client Component import a build-time error. Type-only imports (for type inference) are erased and remain safe.

3. **Same pattern, different tier** — both SDK and admin use the same resource-factory pattern: a factory function receives a runtime object and returns a namespaced object of methods.

---

## 11. `@876/admin` — Admin Client Surface

### Client Factory (`packages/admin/src/client.ts`)

```typescript
import { buildAdminRuntime } from './runtime'
// ... import all resource factories ...

export function create876AdminClient(options: Admin876ClientOptions = {}) {
  const runtime = buildAdminRuntime(options)
  return {
    auditEvents: createAdminAuditEventsResource(runtime),
    users: createAdminUsersResource(runtime),
    auth: createAdminAuthResource(runtime),
    apps: createAdminAppsResource(runtime),
    features: createAdminFeaturesResource(runtime),
    apiKeys: createAdminApiKeysResource(runtime),
    orgs: createAdminOrgsResource(runtime),
    products: createAdminProductsResource(runtime),
    memberships: createAdminMembershipsResource(runtime),
    addresses: createAdminAddressesResource(runtime),
    reservedUsernames: createAdminReservedUsernamesResource(runtime),
    billingAccounts: createAdminBillingAccountsResource(runtime),
    subscriptions: createAdminSubscriptionsResource(runtime),
  }
}
```

### Resource Factory Pattern (Users Example)

```typescript
export function createAdminUsersResource(runtime: AdminRuntime) {
  return {
    // ── Standard CRUD ──
    create(params)           { return adminRequest<AdminUser>(runtime, { method: 'POST',   path: '/users',          body: params }) },
    list(params?)            { return adminRequest<AdminListResponse<AdminUser>>(runtime, { method: 'GET',    path: '/users',             query: params }) },
    retrieve(id, params?)    { return adminRequest<AdminUser>(runtime, { method: 'GET',    path: `/users/${id}`,    query: params }) },
    update(id, body)         { return adminRequest<AdminUser>(runtime, { method: 'PATCH',  path: `/users/${id}`,    body }) },
    delete(id, options?)     { return adminRequest<AdminDeletedUser>(runtime, { method: 'DELETE', path: `/users/${id}`, query: options }) },
    purge(id, options?)      { return adminRequest<AdminDeletedUser>(runtime, { method: 'DELETE', path: `/users/${id}/purge` }) },

    // ── Search ──
    search(params)           { return adminRequest<AdminSearchResponse<AdminUser>>(runtime, { method: 'GET', path: '/users/search', query: params }) },

    // ── Lookup by alternate key ──
    retrieveByWorkosId(id)   { return adminRequest<AdminUser>(runtime, { method: 'GET', path: `/users/by-workos-id/${id}` }) },
    retrieveByUsername(u, p) { return adminRequest<AdminUser>(runtime, { method: 'GET', path: `/users/by-username/${u}`, query: p }) },

    // ── Action verbs (side-effect endpoints) ──
    ban(id, options?)        { return adminRequest<AdminUser>(runtime, { method: 'POST', path: `/users/${id}/ban`,   body: options }) },
    unban(id)                { return adminRequest<AdminUser>(runtime, { method: 'POST', path: `/users/${id}/unban` }) },
    revokeSessions(id)       { return adminRequest<SessionRevoke>(runtime, { method: 'POST', path: `/users/${id}/sessions/revoke` }) },

    // ── Nested sub-resources (scoped by userId) ──
    listAddresses(userId)                    { return adminRequest<>(runtime, { method: 'GET',    path: `/users/${userId}/addresses` }) },
    createAddress(userId, params)            { return adminRequest<>(runtime, { method: 'POST',   path: `/users/${userId}/addresses`, body: params }) },
    retrieveAddress(userId, addressId)       { return adminRequest<>(runtime, { method: 'GET',    path: `/users/${userId}/addresses/${addressId}` }) },
    updateAddress(userId, addressId, params) { return adminRequest<>(runtime, { method: 'PATCH',  path: `/users/${userId}/addresses/${addressId}`, body: params }) },
    deleteAddress(userId, addressId)         { return adminRequest<>(runtime, { method: 'DELETE', path: `/users/${userId}/addresses/${addressId}` }) },

    // ── Sub-resource groups ──
    listFeatures(userId), grantFeature(userId, params), revokeFeature(userId, featureId)
    listOAuthGrants(userId), revokeOAuthGrant(userId, grantId)
    listAccounts(userId), unlinkAccount(userId, accountId)
    listContacts(userId), createContact(userId, params), ...
    retrieveProfile(userId), updateProfile(userId, params), ...
    checkUsernameAvailability(username, options?)
    backfillUsernames()
  }
}
```

### Nested Namespace Pattern (Orgs Example)

Admin client uses nested objects for organizational sub-resources:

```typescript
$876.orgs.locations.create(orgId, params)     // POST /organizations/{org_id}/locations
$876.orgs.locations.list(orgId)               // GET  /organizations/{org_id}/locations
$876.orgs.locations.retrieve(orgId, locId)    // GET  /organizations/{org_id}/locations/{loc_id}
$876.orgs.locations.update(orgId, locId, p)   // PATCH /organizations/{org_id}/locations/{loc_id}
$876.orgs.locations.delete(orgId, locId)      // DELETE /organizations/{org_id}/locations/{loc_id}

$876.orgs.contacts.*     // Same CRUD pattern
$876.orgs.departments.*  // Same CRUD pattern
$876.orgs.employees.*    // Same CRUD pattern
$876.orgs.roles.*        // Same CRUD pattern
$876.orgs.members.*      // Same CRUD pattern
$876.orgs.appAssignments.* // Same CRUD pattern
$876.orgs.subscriptions.* // Provision, update, list, retrieve, batch
$876.orgs.permissions.retrieve()  // GET /organizations/permissions/catalog
```

### Admin Type Definitions (TypeScript-first)

The admin package defines all types as **plain TypeScript types** in one monolithic `types.ts`:

```typescript
export type AdminUser = {
  object: 'user'
  id: string
  email: string
  first_name: string
  last_name: string
  username: string | null
  status: string
  banned: boolean
  platform_role: string | null
  created_at: number
  updated_at: number
  deleted_at: number | null
  // ... 20+ more fields
}

export type AdminUserCreateParams = {
  email: string
  first_name: string
  last_name: string
  middle_name?: string | null
  username?: string | null
  organization_name?: string | null
  // ...
}

export type AdminResult<T> =
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string } }

export type AdminListResponse<T> = {
  object: 'list'
  data: T[]
  has_more: boolean
  url: string
  total_count: number | null
}
```

### Admin Runtime & Request Layer

**Runtime** (`packages/admin/src/runtime.ts`):

```typescript
export function buildAdminRuntime(options: Admin876ClientOptions) {
  return {
    baseUrl: resolveBaseUrl(options.baseUrl), // checks API_URL, NEXT_PUBLIC_876_API_URL, etc.
    internalKey: options.internalKey,
    apiKey: options.apiKey,
    requestId: options.requestId,
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
  }
}
```

**Request layer** (`packages/admin/src/request.ts`):

```typescript
export async function adminRequest<T>(
  runtime: AdminRuntime,
  init: AdminRequestInit
): Promise<AdminResult<T>> {
  const result = await sendClientRequest(
    { baseUrl: runtime.baseUrl, fetch: runtime.fetch },
    {
      method: init.method,
      path: init.path,
      body: init.body,
      query: init.query,
      headers: adminHeaders(runtime), // adds x-internal-key, X-876-API-Key, x-request-id
    }
  )

  if (result.networkError)
    return {
      data: null,
      error: { code: 'admin/network-error', message: 'Network error.' },
    }

  if (result.ok) return { data: result.payload as T, error: null }

  return {
    data: null,
    error: {
      code: payload?.error?.code ?? 'admin/error',
      message: payload?.error?.message ?? 'An error occurred.',
    },
  }
}

function adminHeaders(runtime): Record<string, string> {
  const headers: Record<string, string> = {}
  if (runtime.internalKey) headers['x-internal-key'] = runtime.internalKey
  if (runtime.apiKey) headers['X-876-API-Key'] = runtime.apiKey
  if (runtime.requestId) headers['x-request-id'] = runtime.requestId
  return headers
}
```

### Helper Predicates

```typescript
export function isDeleted(item: { deleted_at: number | null }): boolean {
  return item.deleted_at !== null
}
export function isExpired(item: { expires_at: number | null }): boolean {
  return item.expires_at !== null && item.expires_at < nowUnixSeconds()
}
export function isDefault(item: { is_default: boolean }): boolean {
  return item.is_default
}
export function isRevoked(item: { revoked: boolean }): boolean {
  return item.revoked
}
```

### Result Unwrapping (Lookup)

```typescript
import { isNotFoundError } from '@876/core/client/lookup'

export class AdminLookupError extends Error {
  readonly code: string
  constructor(context: string, error: AdminError) { ... }
}

export function unwrapOptional<T>(result: LookupResult<T>, context: string): T | null {
  if (!result.error) return result.data
  if (isNotFoundError(result.error)) return null
  throw new AdminLookupError(context, result.error)
}

export function unwrapResult<T>(result: LookupResult<T>, context: string): T {
  if (result.error) throw new AdminLookupError(context, result.error)
  return result.data
}
```

---

## 12. `@876/sdk` — Consumer SDK Client Surface

### Client Factory (`packages/sdk/src/client.ts`)

```typescript
export function create876Client(options: ClientOptions = {}) {
  const parsed = auth876ClientOptionsSchema.parse(options)
  const runtime = {
    baseUrl: resolveApiBaseUrl(parsed.baseUrl),
    apiKey: parsed.apiKey,
    fetch: parsed.fetch ?? globalThis.fetch.bind(globalThis),
    credentials: parsed.credentials,
  }

  return {
    auth: createAuthResource(runtime), // $876.auth.*
    oauth: createOAuthMethods(oauthConfig), // $876.oauth.*
    apps: createAppsResource(runtime), // $876.apps.*
    oauthGrants: createOAuthGrantsResource(runtime), // $876.oauthGrants.*
    auditEvents: createAuditEventsResource(runtime), // $876.auditEvents.*
    orgs: createOrgsResource(runtime), // $876.orgs.*
    users: createUsersResource(runtime), // $876.users.*
  }
}
```

### SDK Resource Method Pattern

SDK resources differ from admin in two key ways:

1. **Zod validation** — every response is validated against a Zod schema
2. **Self-scoped** — SDK methods target the caller's own data (`/users/me/*`)

**Users resource** (`packages/sdk/src/resources/users.ts`):

```typescript
export function createUsersResource(runtime: SdkRuntime) {
  return {
    profile: {
      retrieve(options?) { /* GET /users/me/profile → ConsumerProfileResult */ },
      update(params, options?) { /* PATCH /users/me/profile → ConsumerProfileResult */ },
    },
    addresses: {
      list(options?)    { /* GET  /users/me/addresses */ },
      create(p, opts?)  { /* POST /users/me/addresses */ },
      retrieve(id, o?)  { /* GET  /users/me/addresses/{id} */ },
      update(id, p, o?) { /* PATCH /users/me/addresses/{id} */ },
      delete(id, o?)    { /* DELETE /users/me/addresses/{id} */ },
      del(id, o?)       { /* @deprecated alias for delete */ },
    },
    contacts: {
      list, create, retrieve, update, delete, del  // same pattern
    },
  }
}
```

**Orgs resource** (`packages/sdk/src/resources/orgs.ts`) — self-scoped, session-tier:

```typescript
export function createOrgsResource(runtime: SdkRuntime) {
  return {
    retrieve(orgId, opts?)     { /* GET /organizations/{org_id}/details */ },
    update(orgId, params, o?)  { /* PATCH /organizations/{org_id}/details */ },
    locations:  { create, list, retrieve, update, delete },
    contacts:   { create, list, retrieve, update, delete },
    departments:{ create, list, retrieve, update, delete },
    employees:  { create, list, retrieve, update, delete },
    permissions: { retrieve() },
    roles:      { create, list, retrieve, update, delete },
    members:    { list, retrieveMe, update },
    appAssignments: { create, list, revoke },
  }
}
```

### SDK Request Layer (`packages/sdk/src/request.ts`)

```typescript
export async function sendAuthRequest<TSuccess>(
  runtime: SdkRuntime,
  method: ClientHttpMethod,
  path: string,
  body: unknown,
  successSchema: z.ZodType<TSuccess>,
  options?: RequestOptions
): Promise<Result<TSuccess>> {
  if (!runtime.baseUrl)
    return { data: null, error: createAuthError('auth/client-not-configured') }

  const result = await sendClientRequest(
    { baseUrl: runtime.baseUrl, fetch: runtime.fetch },
    {
      method,
      path,
      body,
      headers: getAuthHeaders(runtime, options), // adds X-876-API-Key, x-request-id
      credentials: runtime.credentials, // defaults to 'include'
      signal: options?.signal,
    }
  )

  if (result.networkError)
    return { data: null, error: createAuthError('auth/network-error') }

  // Parse and validate the response against the Zod schema
  const resultSchema = auth876ResultSchema(successSchema)
  const parsed = resultSchema.safeParse(normalizedPayload)

  if (!parsed.success)
    return { data: null, error: createAuthError('auth/invalid-response') }
  return parsed.data
}
```

---

## 13. Zod Schema & Type Definition Patterns

The SDK uses **Zod-first** design — every shape is defined as a Zod schema, then TypeScript types are inferred:

### Response Schema Naming Convention

```typescript
// Response schemas (for API responses)
const sdk876ConsumerAddressSchema = z.strictObject({
  object: z.literal('address'),
  id: nonEmptyString,
  user_id: nonEmptyString.nullable(),
  type: z.enum(['home', 'work', 'other']),
  label: nullableString,
  line1: nullableString,
  city: nullableString,
  region_id: nullableString,
  country_code: nullableString,
  is_default: z.boolean(),
  created_at: z.number(),
  updated_at: z.number(),
})

// List response schemas
const sdk876ConsumerAddressListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(sdk876ConsumerAddressSchema),
  has_more: z.boolean(),
  url: z.string(),
  total_count: z.number().int().nullable(),
})

// Create params (camelCase — client-facing)
const sdk876ConsumerAddressCreateParamsSchema = z.strictObject({
  type: z.enum(['home', 'work', 'other']).default('other'),
  label: z.string().nullable().optional(),
  line1: z.string().nullable().optional(),
  regionId: z.string().nullable().optional(), // camelCase!
  countryCode: z.string().nullable().optional(), // camelCase!
  isDefault: z.boolean().optional(), // camelCase!
})

// Update params
const sdk876ConsumerAddressUpdateParamsSchema =
  sdk876ConsumerAddressCreateParamsSchema.partial()

// Delete response (tombstone)
const sdk876DeletedConsumerAddressSchema = z.strictObject({
  object: z.literal('address'),
  id: nonEmptyString,
  deleted: z.literal(true),
})
```

### Inferred Types

```typescript
// Response types use z.infer (exact shape)
export type ConsumerAddress = z.infer<typeof sdk876ConsumerAddressSchema>

// Param types use z.input (allows transforms/defaults)
export type ConsumerAddressCreateParams = z.input<
  typeof sdk876ConsumerAddressCreateParamsSchema
>

// Result envelope types
export type ConsumerAddressResult = Result<ConsumerAddress>
export type ConsumerAddressListResult = Result<ConsumerAddressList>
export type DeletedConsumerAddressResult = Result<DeletedConsumerAddress>
```

### Result Envelope Schema

```typescript
export function auth876ResultSchema<TSuccess>(
  successSchema: z.ZodType<TSuccess>
) {
  return z.union([
    z.strictObject({ data: successSchema, error: z.null() }),
    z.strictObject({ data: z.null(), error: auth876ErrorSchema }),
  ])
}
```

### Key Zod Conventions

| Pattern        | Naming                               | Transform                           |
| -------------- | ------------------------------------ | ----------------------------------- |
| Response       | `sdk876<Resource>Schema`             | snake_case fields                   |
| List           | `sdk876<Resource>ListSchema`         | `{ object: 'list', data: [], ... }` |
| Create params  | `sdk876<Resource>CreateParamsSchema` | camelCase fields                    |
| Update params  | `sdk876<Resource>UpdateParamsSchema` | camelCase, `.partial()` of create   |
| Delete         | `sdk876Deleted<Resource>Schema`      | `{ object, id, deleted: true }`     |
| Type inference | `z.infer<>` for response             | exact match                         |
| Type inference | `z.input<>` for params               | allows defaults/transforms          |

---

## 14. Core Transport Layer (`@876/core/client`)

The lowest-level HTTP transport, shared by both SDK and admin:

```typescript
export type ClientHttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export async function sendClientRequest(
  transport: ClientTransport, // { baseUrl: string, fetch: typeof fetch }
  init: ClientRequestInit
): Promise<ClientHttpResult> {
  try {
    const response = await transport.fetch(
      resolveClientUrl(transport.baseUrl, init.path, init.query),
      {
        method: init.method,
        headers: { 'Content-Type': 'application/json', ...init.headers },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        credentials: init.credentials,
        signal: init.signal,
      }
    )
    const payload = await response.json().catch(() => null)
    return {
      networkError: false,
      ok: response.ok,
      status: response.status,
      payload,
    }
  } catch {
    return { networkError: true, ok: false, status: 0, payload: null }
  }
}
```

**Key design**: network failures never throw — they resolve to `{ networkError: true }`. Each tier maps this to its own error code (`auth/network-error` or `admin/network-error`).

### Base URL Resolution Cascade

```
1. Explicit baseUrl from constructor options
2. Environment variables (tier-specific precedence):
   - SDK: ['NEXT_PUBLIC_876_API_URL', 'NEXT_PUBLIC_API_URL']
   - Admin: ['API_URL', 'NEXT_PUBLIC_876_API_URL', 'NEXT_PUBLIC_API_URL']
3. Codespaces auto-detection (browser-side port forwarding)
4. Development fallback: http://localhost:4000
5. Production fallback: https://eight76-api.onrender.com
```

### Client Options Shape

```typescript
export type Admin876ClientOptions = {
  baseUrl?: string // API base URL
  internalKey?: string // Server-side admin key (x-internal-key)
  apiKey?: string // API key for approved requests
  requestId?: string // Cross-service log correlation
  fetch?: typeof fetch // Injectable for tests/custom runtimes
}
```

---

## 15. Console App Communication Patterns

### Server Singleton (`apps/console/src/lib/876/index.ts`)

```typescript
import 'server-only'
import { create876AdminClient } from '@876/admin'

export const $876 = create876AdminClient({
  internalKey: process.env.API_INTERNAL_KEY,
  apiKey: process.env.API_876_KEY,
})
```

This is a **server-only singleton** that authenticates via:

- **`x-internal-key`** header (from `API_INTERNAL_KEY`) — identifies as privileged admin
- **`X-876-API-Key`** header (from `API_876_KEY`) — secondary auth

### Calling Patterns

#### Pattern A: Direct `$876` calls from Server Components (read-only)

```typescript
// apps/console/src/app/(app)/users/page.tsx
import { $876 } from '@/lib/876'

export default async function UsersPage({ searchParams }) {
  const result = await $876.users.list({ limit: 25, starting_after: 'usr_abc123' })

  if (result.error) throw new Error(result.error.message)
  const users = result.data.data  // AdminListResponse<AdminUser>

  return <UsersTable users={users} />
}
```

#### Pattern B: Cached data fetchers (data co-location)

```typescript
// apps/console/src/app/(app)/users/[username]/_data.ts
import { cache } from 'react'
import { $876 } from '@/lib/876'

export const resolveUser = cache(async (username: string) => {
  const result = username.startsWith('user_')
    ? await $876.users.retrieve(username, { include_deleted: true })
    : await $876.users.retrieveByUsername(username, { include_deleted: true })
  return result.error ? null : result.data
})

export const resolveUserAddresses = cache(async (userId: string) => {
  const result = await $876.users.listAddresses(userId)
  return result.error ? [] : result.data.data
})
```

#### Pattern C: Service layer (mutations with orchestration)

```typescript
// apps/console/src/lib/service/users/update.ts
export async function update(id: string, body: AdminUserUpdateParams, caller?: Access) {
  if (caller && typeof (body as { role?: unknown }).role === 'string') {
    const check = await assertRoleChangeAllowed(caller, id, ...)
    if (!check.ok) return err(check.error, check.status)
  }
  const { data, error } = await $876.users.update(id, body)
  if (error || !data) return err(error?.message ?? 'Failed to update user.')
  return ok(data)
}
```

### Two-Track Data Architecture

| Track     | Module                             | Scope              | Used For                                       |
| --------- | ---------------------------------- | ------------------ | ---------------------------------------------- |
| `$876`    | `@876/admin` → talks to 876 API    | Platform data      | Users, orgs, apps, features, memberships, etc. |
| `service` | `@/lib/service` → Console's own DB | Console-local data | Team members, roles, notes, permission grants  |

### Complete Data Flow Diagram

```
Browser (Client Component)
  │
  ├── Pattern A: Server Component (direct)
  │     └── $876.users.list()        ← server-only
  │           └── adminRequest()
  │                 └── sendClientRequest()
  │                       └── fetch('https://api.../users',
  │                                   { headers: { x-internal-key: ... } })
  │                             └── FastAPI (AdminDep → X-Internal-Key check)
  │
  ├── Pattern B: Cached data fetcher
  │     └── resolveUser(username)    ← React.cache()
  │           └── $876.users.retrieve(username)
  │                 └── ... (same transport chain)
  │
  └── Pattern C: Service layer (mutation)
        └── fetch('/api/users/update', { method: 'POST' })
              └── Next.js Route Handler (Server)
                    └── requireConsolePermission('console:users')
                          └── service.users.update(id, body)
                                └── $876.users.update(id, body)
                                      └── ... (adminRequest → sendClientRequest)
```

---

## 16. Complete Data Flow Walkthrough

### Example: Listing Users in the Console

**Step 1 — Server Component calls `$876.users.list()`**

```typescript
// apps/console/src/app/(app)/users/page.tsx
const result = await $876.users.list({ limit: 25 })
```

**Step 2 — Admin client sends the request**

`createAdminUsersResource(runtime).list()` calls `adminRequest()` with:

- `method: 'GET'`
- `path: '/users'`
- `query: { limit: 25 }`
- Runtime adds `x-internal-key: ${process.env.API_INTERNAL_KEY}` header

**Step 3 — Transport resolves URL and fetches**

```typescript
// @876/core/client → sendClientRequest
transport.fetch('https://eight76-api.onrender.com/users?limit=25', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json', 'x-internal-key': 'sec_...' },
})
```

**Step 4 — FastAPI processes the request**

1. `require_api_key` validates the API key (SHA-256 hash check)
2. `require_admin` validates the X-Internal-Key header
3. Route handler runs: `UserRepository(db).list(limit=25)`
4. Response: `{ object: 'list', data: [...], has_more: false, url: '/users', total_count: 150 }`

**Step 5 — Transport receives the response**

```typescript
// @876/core/client
const payload = await response.json()
return { networkError: false, ok: true, status: 200, payload }
```

**Step 6 — Admin request layer shapes the error**

```typescript
// @876/admin/request → adminRequest
if (result.ok)
  return { data: result.payload as AdminListResponse<AdminUser>, error: null }
```

**Step 7 — Server component handles the result**

```typescript
if (result.error) throw new Error(result.error.message)
const users = result.data.data // typed as AdminUser[]
```

### Example: Creating a User via the Console Service Layer

```
Browser Client              Next.js Route Handler           @876/admin              876 API (FastAPI)
     │                            │                            │                        │
     │  POST /api/users/create    │                            │                        │
     │───────────────────────────►│                            │                        │
     │                            │                            │                        │
     │                            │  requireConsolePermission()│                        │
     │                            │───────────────────────────►│                        │
     │                            │◄───────────────────────────│                        │
     │                            │                            │                        │
     │                            │  $876.users.create(params) │                        │
     │                            │────────────────────────────┤                        │
     │                            │                            │  POST /users           │
     │                            │                            │────────────────────────►│
     │                            │                            │  x-internal-key: ...   │
     │                            │                            │◄────────────────────────│
     │                            │                            │  { object: 'user',     │
     │                            │◄───────────────────────────│    id: 'usr_...', ... }│
     │                            │                            │                        │
     │  { data: { user: ... } }  │                            │                        │
     │◄───────────────────────────│                            │                        │
```

---

## 17. Stripe-Style API Contract Conventions

This SDK explicitly mirrors the **Stripe API design philosophy**:

### 1. Object Type Discriminator

Every resource has an `object` string discriminator:

```typescript
{ object: 'user', id: 'usr_...' }
{ object: 'organization', id: 'org_...' }
{ object: 'address', id: 'addr_...' }
{ object: 'list', data: [...], has_more: ..., url: '...' }
```

### 2. ID Prefix Convention

| Prefix        | Resource           |
| ------------- | ------------------ |
| `usr_`        | User               |
| `org_`        | Organization       |
| `addr_`       | Address            |
| `app_`        | App / OAuth Client |
| `key_`        | API Key            |
| `role_`       | Role               |
| `mem_`        | Membership         |
| `contact`     | Contact            |
| `userProfile` | Consumer Profile   |

### 3. Paginated List Responses

```typescript
{ object: 'list', data: [...], has_more: true, url: '/users', total_count: 150 }
```

Cursor pagination via `starting_after` / `ending_before` (keyset on `created_at`).

### 4. Discriminated Result Envelope

```typescript
// Always { data, error } — never throws
type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string } }
```

### 5. Timestamps as Unix Seconds

All `created_at`, `updated_at`, `deleted_at`, `expires_at` are Unix epoch seconds (numbers).

### 6. Naming Convention Split

| Context             | Convention                    | Example                                          |
| ------------------- | ----------------------------- | ------------------------------------------------ |
| API response (JSON) | `snake_case`                  | `first_name`, `client_secret`, `organization_id` |
| SDK input params    | `camelCase`                   | `firstName`, `clientSecret`, `organizationId`    |
| Admin input params  | `snake_case` (trusted server) | `first_name`, `organization_id`                  |

### 7. Soft Delete with Tombstones

Delete operations return `{ object: 'address', id: 'addr_...', deleted: true }` rather than HTTP 204 No Content.

### 8. HTTP Verb → REST Convention

| Action   | HTTP Method                                |
| -------- | ------------------------------------------ |
| Create   | `POST`                                     |
| Retrieve | `GET`                                      |
| Update   | `PATCH` (partial, never PUT)               |
| Delete   | `DELETE`                                   |
| List     | `GET` (with `?limit=N&starting_after=...`) |
| Search   | `GET /{resource}/search?query=...`         |
| Action   | `POST /{resource}/{id}/{action}`           |

### 9. SDK Verb Vocabulary

| Verb         | HTTP Method     | Purpose                          |
| ------------ | --------------- | -------------------------------- |
| `create()`   | POST            | Create a new resource            |
| `retrieve()` | GET             | Fetch a single resource by ID    |
| `list()`     | GET             | Fetch a paginated collection     |
| `update()`   | PATCH           | Partial update                   |
| `delete()`   | DELETE          | Soft-delete (tombstone returned) |
| `purge()`    | DELETE `/purge` | Hard-delete (admin only)         |
| `search()`   | GET `/search`   | Text search across resources     |

### 10. Admin Package Exported Surface

```typescript
import 'server-only'

export { create876AdminClient }
export type { Admin876Client }
export { isDeleted, isDefault, isExpired, isRevoked }
export { AdminLookupError, isNotFoundError, unwrapOptional, unwrapResult }
// 80+ type exports (AdminUser, AdminOrganization, AdminListResponse, ...)
```

### 11. SDK Package Exported Surface

```typescript
export { create876Client }
export type { SDK876AuthClient, SDK876Client }
export { createSignInWith876, generatePkce }
export type { OAuthClient, SignInWith876Options }
export { createAuthError, createOAuthError, createSdkError }
// 100+ type exports (ConsumerAddress, Result, LoginParams, Session, ...)
```

---

## Appendix: Quick Reference — Pattern Cheat Sheet

### Adding a New API Resource (5 steps)

1. **API backend**: Create `domains/<resource>/router.py`, `schemas.py`, `docs.py`
2. **Register routes**: Add `router.include_router(...)` in `api/v1.py`
3. **Add repository**: Extend `BaseRepository` in `db/repositories/`
4. **SDK/admin client**: Add resource factory in `packages/admin/src/resources/` or `packages/sdk/src/resources/`
5. **Types**: Add Zod schema in SDK `types/` or TypeScript type in admin `types.ts`

### Route Handler Decorator Template

```python
@router.get(
    "/{resource_id}",                                              # Path
    response_model=ResourceResponse,                               # Pydantic response
    status_code=status.HTTP_200_OK,                                # HTTP status
    summary=docs.RETRIEVE_RESOURCE_SUMMARY,                       # From docs.py
    description=docs.RETRIEVE_RESOURCE_DESCRIPTION,                # From docs.py
    responses=docs.RETRIEVE_RESOURCE_RESPONSES,                    # Error responses
)
async def retrieve_resource(
    resource_id: str,                                              # Path parameter
    _admin: AdminDep,                                              # Auth dependency
    db: Annotated[AsyncSession, Depends(get_db)],                 # DB session
    include_deleted: bool = False,                                 # Query parameter
) -> ResourceResponse:
    ...
```

### Admin Resource Factory Template

```typescript
export function createAdmin<Resource>sResource(runtime: AdminRuntime) {
  return {
    create(params)         { return adminRequest<Admin<Resource>>(runtime, { method: 'POST',   path: '/<resources>',       body: params }) },
    list(params?)          { return adminRequest<AdminListResponse<Admin<Resource>>>(runtime, { method: 'GET', path: '/<resources>',    query: params }) },
    retrieve(id, params?)  { return adminRequest<Admin<Resource>>(runtime, { method: 'GET',    path: `/<resources>/${id}`, query: params }) },
    update(id, body)       { return adminRequest<Admin<Resource>>(runtime, { method: 'PATCH',  path: `/<resources>/${id}`, body }) },
    delete(id, options?)   { return adminRequest<AdminDeleted<Resource>>(runtime, { method: 'DELETE', path: `/<resources>/${id}` }) },
  }
}
```

### SDK Resource Factory Template

```typescript
export function create<Resource>sResource(runtime: SdkRuntime) {
  return {
    list(options?) {
      return sendAuthRequest(runtime, 'GET', '/<resources>', undefined, sdk876<Resource>ListSchema, options)
    },
    create(params, options?) {
      const validation = validateParams(sdk876<Resource>CreateParamsSchema, params)
      if (validation.error) return Promise.resolve(validation)
      return sendAuthRequest(runtime, 'POST', '/<resources>', validation.data, sdk876<Resource>Schema, options)
    },
    retrieve(id, options?) {
      return sendAuthRequest(runtime, 'GET', `/<resources>/${id}`, undefined, sdk876<Resource>Schema, options)
    },
    update(id, params, options?) { ... },
    delete(id, options?) { ... },
  }
}
```
