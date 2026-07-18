"""Declarative bootstrap manifests for first-party provisioning targets."""

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.logging import get_logger
from core.platform_apps import PLATFORM_APPS, PlatformApp
from core.timestamps import now_unix_seconds
from db.models import App, ProvisioningManifestRevision
from db.repositories.provisioning import ProvisioningRepository
from db.session import AsyncSessionLocal
from domains.provisioning.schemas import ProvisioningDraftReplace, ProvisioningTargetType
from services.finance_provisioning import reconcile_finance_connections
from services.provisioning_catalog import validate_draft

logger = get_logger(__name__)


def _string(key: str, value: str) -> dict[str, object]:
    return {"key": key, "value_type": "string", "string_value": value}


def _integer(key: str, value: int) -> dict[str, object]:
    return {"key": key, "value_type": "integer", "integer_value": value}


def _decimal(key: str, value: str) -> dict[str, object]:
    return {"key": key, "value_type": "decimal", "decimal_value": Decimal(value)}


def _boolean(key: str, value: bool) -> dict[str, object]:
    return {"key": key, "value_type": "boolean", "boolean_value": value}


def _reference(key: str, namespace: str, value: str) -> dict[str, object]:
    return {
        "key": key,
        "value_type": "reference",
        "reference_namespace": namespace,
        "reference_key": value,
    }


def _resource(resource_type: str, key: str, position: int, properties: list[dict[str, object]]) -> dict[str, object]:
    return {
        "resource_type": resource_type,
        "key": key,
        "position": position,
        "properties": properties,
    }


FINANCE_BOOTSTRAP_RESOURCES = [
    _resource(
        "workspace",
        "default",
        0,
        [
            _reference("countryCode", "country", "JM"),
            _reference("baseCurrency", "currency", "JMD"),
            _reference("defaultCurrency", "currency", "JMD"),
            _reference("defaultLanguage", "language", "en"),
        ],
    ),
    _resource(
        "currency",
        "JMD",
        10,
        [
            _string("code", "JMD"),
            _string("name", "Jamaican Dollar"),
            _string("numericCode", "388"),
            _integer("minorUnit", 2),
            _string("symbol", "$"),
        ],
    ),
    _resource("payment_mode", "cash", 20, [_string("name", "Cash")]),
    _resource("payment_mode", "credit-card", 30, [_string("name", "Credit Card")]),
    _resource("payment_mode", "bank-transfer", 40, [_string("name", "Bank Transfer")]),
    _resource(
        "payment_term",
        "due-on-receipt",
        50,
        [_string("name", "Due on Receipt"), _string("rule", "DUE_ON_RECEIPT"), _integer("dueDays", 0)],
    ),
    _resource(
        "payment_term",
        "net-15",
        60,
        [_string("name", "Net 15"), _string("rule", "NET_DAYS"), _integer("dueDays", 15)],
    ),
    _resource(
        "payment_term",
        "net-30",
        70,
        [_string("name", "Net 30"), _string("rule", "NET_DAYS"), _integer("dueDays", 30)],
    ),
    _resource(
        "payment_term",
        "net-45",
        80,
        [_string("name", "Net 45"), _string("rule", "NET_DAYS"), _integer("dueDays", 45)],
    ),
    _resource(
        "payment_term",
        "net-60",
        90,
        [_string("name", "Net 60"), _string("rule", "NET_DAYS"), _integer("dueDays", 60)],
    ),
    _resource(
        "invoice_preference",
        "default",
        100,
        [
            _string("defaultTaxBehavior", "EXCLUSIVE"),
            _boolean("lateFeesEnabled", False),
            _string("lateFeeCalculationType", "PERCENTAGE"),
            _integer("lateFeeGraceDays", 0),
            _boolean("lateFeeGenerateAsDraft", True),
        ],
    ),
    _resource(
        "tax_authority",
        "taj",
        110,
        [
            _string("name", "Tax Administration Jamaica"),
            _string("description", "Jamaica's national tax administration."),
            _reference("countryCode", "country", "JM"),
        ],
    ),
    _resource(
        "tax_rate",
        "gct-standard",
        120,
        [
            _string("name", "Standard GCT"),
            _string("description", "Jamaica standard General Consumption Tax rate."),
            _string("taxType", "GCT"),
            _decimal("rate", "15.00000000"),
            _boolean("inclusive", False),
            _reference("authority", "tax_authority", "taj"),
        ],
    ),
]

FINANCE_BOOTSTRAP_STEPS = [
    {"key": "workspace", "description": "Create the finance workspace.", "position": 0},
    {"key": "currencies", "description": "Create configured currencies.", "position": 10},
    {"key": "payment-modes", "description": "Create payment modes.", "position": 20},
    {"key": "payment-terms", "description": "Create payment terms.", "position": 30},
    {"key": "invoice-preferences", "description": "Create invoice preferences.", "position": 40},
    {"key": "tax-authorities", "description": "Create tax authorities.", "position": 50},
    {"key": "tax-rates", "description": "Create tax rates.", "position": 60},
]


async def seed_first_party_provisioning_manifests(_engine: object) -> None:
    async with AsyncSessionLocal() as session:
        repository = ProvisioningRepository(session)
        await _seed_static_target(repository, "organization", "global", resources=[], steps=[])
        await _seed_static_target(
            repository,
            "finance",
            "shared",
            resources=FINANCE_BOOTSTRAP_RESOURCES,
            steps=FINANCE_BOOTSTRAP_STEPS,
        )
        for definition in PLATFORM_APPS:
            await _seed_application(session, repository, definition)
        await session.commit()


async def _seed_static_target(
    repository: ProvisioningRepository,
    target_type: ProvisioningTargetType,
    target_key: str,
    *,
    resources: list[dict[str, object]],
    steps: list[dict[str, object]],
) -> None:
    published = await repository.retrieve_revision(target_type, target_key, "published")
    if published is not None:
        return
    if await _has_unpublished_changes(repository, target_type, target_key, published):
        return

    draft = ProvisioningDraftReplace.model_validate(
        {
            "reconciliation": "create_missing",
            "preserve_tenant_overrides": True,
            "finance_dependency": "none",
            "finance_scopes": [],
            "resources": resources,
            "steps": steps,
        }
    )
    await _publish_seed_draft(repository, target_type, target_key, target_key, draft)


async def _seed_application(
    session: AsyncSession,
    repository: ProvisioningRepository,
    definition: PlatformApp,
) -> None:
    app = await session.scalar(select(App).where(App.slug == definition.slug).with_for_update())
    if app is None:
        logger.error("provisioning.seed.app_missing", app_slug=definition.slug)
        return
    published = await repository.retrieve_revision("application", app.id, "published")
    desired_scopes = sorted(set(definition.finance_scopes))
    if (
        published is not None
        and published.finance_dependency == definition.finance_dependency
        and sorted(published.finance_scopes) == desired_scopes
    ):
        return
    if await _has_unpublished_changes(repository, "application", app.id, published):
        return

    resources = []
    steps = []
    if published is not None:
        resources = [
            {
                "resource_type": resource.resource_type,
                "key": resource.key,
                "position": resource.position,
                "properties": [
                    {
                        "key": property_.key,
                        "value_type": property_.value_type,
                        "string_value": property_.string_value,
                        "integer_value": property_.integer_value,
                        "decimal_value": property_.decimal_value,
                        "boolean_value": property_.boolean_value,
                        "reference_namespace": property_.reference_namespace,
                        "reference_key": property_.reference_key,
                    }
                    for property_ in resource.properties
                ],
            }
            for resource in published.resources
        ]
        steps = [
            {"key": step.key, "description": step.description, "position": step.position} for step in published.steps
        ]

    draft = ProvisioningDraftReplace.model_validate(
        {
            "reconciliation": "create_missing",
            "preserve_tenant_overrides": True,
            "finance_dependency": definition.finance_dependency,
            "finance_scopes": desired_scopes,
            "resources": resources,
            "steps": steps,
        }
    )
    revision = await _publish_seed_draft(repository, "application", app.id, app.slug, draft)
    scanned, changed, _ = await reconcile_finance_connections(session, app_id=app.id, limit=None)
    logger.info(
        "provisioning.seed.application_published",
        app_id=app.id,
        app_slug=definition.slug,
        revision=revision.revision,
        finance_dependency=revision.finance_dependency,
        finance_subscriptions_scanned=scanned,
        finance_events_enqueued=changed,
    )


async def _has_unpublished_changes(
    repository: ProvisioningRepository,
    target_type: ProvisioningTargetType,
    target_key: str,
    published: ProvisioningManifestRevision | None,
) -> bool:
    draft = await repository.retrieve_revision(target_type, target_key, "draft")
    if draft is None:
        return False
    if published is not None and _revision_content(draft) == _revision_content(published):
        return False

    logger.warning(
        "provisioning.seed.draft_preserved",
        target_type=target_type,
        target_key=target_key,
        draft_revision=draft.revision,
        published_revision=published.revision if published is not None else None,
    )
    return True


def _revision_content(revision: ProvisioningManifestRevision) -> tuple[object, ...]:
    resources = tuple(
        sorted(
            (
                resource.resource_type,
                resource.key,
                resource.position,
                tuple(
                    sorted(
                        (
                            property_.key,
                            property_.value_type,
                            property_.string_value,
                            property_.integer_value,
                            property_.decimal_value,
                            property_.boolean_value,
                            property_.reference_namespace,
                            property_.reference_key,
                        )
                        for property_ in resource.properties
                    )
                ),
            )
            for resource in revision.resources
        )
    )
    steps = tuple(
        sorted((step.key, step.description, step.position) for step in revision.steps)
    )
    return (
        revision.reconciliation,
        revision.preserve_tenant_overrides,
        revision.finance_dependency,
        tuple(sorted(revision.finance_scopes)),
        resources,
        steps,
    )


async def _publish_seed_draft(
    repository: ProvisioningRepository,
    target_type: ProvisioningTargetType,
    target_key: str,
    catalog_key: str,
    draft: ProvisioningDraftReplace,
) -> ProvisioningManifestRevision:
    issues = validate_draft(target_type, catalog_key, draft)
    if issues:
        issue = issues[0]
        raise RuntimeError(f"Invalid bootstrap provisioning manifest at {issue.path}: {issue.message}")
    now = now_unix_seconds()
    await repository.replace_draft(
        target_type,
        target_key,
        reconciliation=draft.reconciliation,
        preserve_tenant_overrides=draft.preserve_tenant_overrides,
        finance_dependency=draft.finance_dependency,
        finance_scopes=draft.finance_scopes,
        resources=draft.resources,
        steps=draft.steps,
        now=now,
    )
    published = await repository.publish(target_type, target_key, now=now)
    if published is None:
        raise RuntimeError("Bootstrap provisioning draft disappeared before publication.")
    return published
