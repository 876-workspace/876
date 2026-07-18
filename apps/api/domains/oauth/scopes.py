"""
OAuth / OIDC scope registry and claim resolver.

Single source of truth for the scopes this authorization server supports and the
OIDC claims each scope releases. Discovery (`scopes_supported`,
`claims_supported`), the UserInfo endpoint, and ID token assembly are all driven
from this registry, so adding a scope or claim is a data change here rather than
edits scattered across the router.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

# Scope that requests a refresh token (long-lived offline access).
OFFLINE_ACCESS_SCOPE = "offline_access"

# Standard OIDC claims always present in issued tokens regardless of scope.
PROTOCOL_CLAIMS: tuple[str, ...] = (
    "iss",
    "sub",
    "aud",
    "exp",
    "iat",
    "auth_time",
    "nonce",
)


@dataclass(frozen=True)
class ScopeDefinition:
    """A requestable OAuth scope and the OIDC claims it releases."""

    name: str
    description: str
    claims: tuple[str, ...] = ()


# Ordered so consent UIs and discovery list scopes predictably. `sub` is a
# protocol claim (always present), so `openid` releases no extra claims itself.
SCOPE_REGISTRY: dict[str, ScopeDefinition] = {
    "billing.organizations.read": ScopeDefinition(
        name="billing.organizations.read",
        description="Read Billing workspace details for organizations you can access.",
    ),
    "billing.customers.read": ScopeDefinition(
        name="billing.customers.read",
        description="Read Billing customers for organizations you can access.",
    ),
    "billing.customers.write": ScopeDefinition(
        name="billing.customers.write",
        description="Create and update Billing customers for organizations you can access.",
    ),
    "billing.items.read": ScopeDefinition(
        name="billing.items.read",
        description="Read Billing catalog items for organizations you can access.",
    ),
    "billing.items.write": ScopeDefinition(
        name="billing.items.write",
        description="Create and update Billing catalog items for organizations you can access.",
    ),
    "billing.plans.read": ScopeDefinition(
        name="billing.plans.read",
        description="Read Billing plans for organizations you can access.",
    ),
    "billing.subscriptions.read": ScopeDefinition(
        name="billing.subscriptions.read",
        description="Read Billing subscriptions for organizations you can access.",
    ),
    "billing.subscriptions.write": ScopeDefinition(
        name="billing.subscriptions.write",
        description="Manage Billing subscriptions for organizations you can access.",
    ),
    "billing.invoices.read": ScopeDefinition(
        name="billing.invoices.read",
        description="Read Billing invoices for organizations you can access.",
    ),
    "billing.invoices.write": ScopeDefinition(
        name="billing.invoices.write",
        description="Create and manage Billing invoices for organizations you can access.",
    ),
    "billing.payments.read": ScopeDefinition(
        name="billing.payments.read",
        description="Read Billing payments for organizations you can access.",
    ),
    "billing.payments.write": ScopeDefinition(
        name="billing.payments.write",
        description="Record Billing payments for organizations you can access.",
    ),
    "openid": ScopeDefinition(
        name="openid",
        description="Sign you in with your 876 account.",
    ),
    "email": ScopeDefinition(
        name="email",
        description="Your email address and its verification status.",
        claims=("email", "email_verified"),
    ),
    "profile": ScopeDefinition(
        name="profile",
        description="Your name and profile picture.",
        claims=("name", "given_name", "family_name", "picture"),
    ),
    OFFLINE_ACCESS_SCOPE: ScopeDefinition(
        name=OFFLINE_ACCESS_SCOPE,
        description="Keep you signed in when you're away (refresh tokens).",
    ),
}


def supported_scopes() -> list[str]:
    """All scopes this server advertises in discovery."""
    return list(SCOPE_REGISTRY)


def supported_claims() -> list[str]:
    """Protocol claims plus every claim releasable by a registered scope."""
    claims: list[str] = list(PROTOCOL_CLAIMS)
    for definition in SCOPE_REGISTRY.values():
        for claim in definition.claims:
            if claim not in claims:
                claims.append(claim)

    return claims


def is_scope_supported(scope: str) -> bool:
    return scope in SCOPE_REGISTRY


def grants_offline_access(scopes: list[str]) -> bool:
    return OFFLINE_ACCESS_SCOPE in scopes


def claims_for_scopes(scopes: list[str]) -> set[str]:
    """The set of OIDC claim names released by the given scopes."""
    granted: set[str] = set()
    for scope in scopes:
        definition = SCOPE_REGISTRY.get(scope)
        if definition:
            granted.update(definition.claims)

    return granted


def resolve_identity_claims(scopes: list[str], user: Any) -> dict[str, Any]:
    """Build the OIDC identity claims released by the granted scopes for a user."""
    wanted = claims_for_scopes(scopes)

    available: dict[str, Any] = {
        "email": user.email,
        "email_verified": user.email_verified,
        "name": f"{user.first_name} {user.last_name}".strip(),
        "given_name": user.first_name,
        "family_name": user.last_name,
        "picture": user.avatar,
    }

    claims: dict[str, Any] = {}
    for claim in wanted:
        value = available.get(claim)
        if claim == "picture" and not value:
            continue
        claims[claim] = value

    return claims
