"""Idempotent, self-guarded schema migrations shared by the app lifespan and the seed scripts."""

from typing import Any

from sqlalchemy import inspect as sa_inspect
from sqlalchemy import text as sa_text
from sqlalchemy.engine import Connection

from core.config import get_settings
from core.logging import get_logger

logger = get_logger(__name__)


def ensure_apps_status_column(conn: Connection) -> None:
    """Backfill the apps.status column before ORM app seed operations run."""
    inspector: Any = sa_inspect(conn)
    columns = {column["name"] for column in inspector.get_columns("apps")}
    if "status" in columns:
        return

    conn.execute(sa_text("ALTER TABLE apps ADD COLUMN status VARCHAR NOT NULL DEFAULT 'active'"))


def ensure_provisioning_v1_cutover(conn: Connection) -> None:
    """Move the active app recipes into the permanent manifest-v1 schema.

    The cutover intentionally retains only the active legacy recipe. Historical
    app-profile version numbers described protocol and content at the same time,
    so they cannot be represented honestly in the new contract. The copied
    content becomes immutable revision 1 under manifest version 1.
    """
    inspector: Any = sa_inspect(conn)
    tables = set(inspector.get_table_names())
    required = {
        "provisioning_manifests",
        "provisioning_manifest_revisions",
        "provisioning_resources",
        "provisioning_properties",
        "provisioning_steps",
        "provisioning_notes",
    }
    if not required.issubset(tables):
        raise RuntimeError("Provisioning v1 tables must be created before the legacy cutover.")

    legacy_tables = {
        "app_provisioning_profiles",
        "app_provisioning_resources",
        "app_provisioning_properties",
        "app_provisioning_steps",
        "app_provisioning_notes",
    }
    if not legacy_tables.issubset(tables):
        return

    existing = conn.execute(sa_text("SELECT EXISTS (SELECT 1 FROM provisioning_manifests)")).scalar_one()
    if not existing:
        conn.execute(
            sa_text(
                """
                DO $$
                BEGIN
                INSERT INTO provisioning_manifests (
                    id, target_type, target_key, manifest_version, created_at, updated_at
                )
                SELECT
                    'pm_' || substr(md5('application:' || app.id), 1, 24),
                    'application', app.id, 1, app.created_at, app.updated_at
                FROM apps AS app;

                INSERT INTO provisioning_manifests (
                    id, target_type, target_key, manifest_version, created_at, updated_at
                )
                SELECT
                    'pm_' || substr(md5('finance:shared'), 1, 24),
                    'finance', 'shared', 1,
                    COALESCE(MIN(created_at), extract(epoch FROM now())::bigint),
                    COALESCE(MAX(updated_at), extract(epoch FROM now())::bigint)
                FROM apps;

                INSERT INTO provisioning_manifests (
                    id, target_type, target_key, manifest_version, created_at, updated_at
                )
                SELECT
                    'pm_' || substr(md5('organization:global'), 1, 24),
                    'organization', 'global', 1,
                    COALESCE(MIN(created_at), extract(epoch FROM now())::bigint),
                    COALESCE(MAX(updated_at), extract(epoch FROM now())::bigint)
                FROM apps;

                INSERT INTO provisioning_manifest_revisions (
                    id, manifest_id, revision, status, reconciliation,
                    preserve_tenant_overrides, finance_dependency, finance_scopes,
                    published_at, created_at, updated_at
                )
                SELECT
                    'pmr_' || substr(md5('application:' || app.id || '/1'), 1, 24),
                    'pm_' || substr(md5('application:' || app.id), 1, 24),
                    1, 'published', 'create_missing', true,
                    COALESCE(profile.finance_dependency, 'none'),
                    COALESCE(profile.finance_scopes, '{}'),
                    COALESCE(profile.updated_at, app.updated_at),
                    COALESCE(profile.created_at, app.created_at),
                    COALESCE(profile.updated_at, app.updated_at)
                FROM apps AS app
                LEFT JOIN app_provisioning_profiles AS profile
                    ON profile.app_id = app.id AND profile.is_active;

                INSERT INTO provisioning_manifest_revisions (
                    id, manifest_id, revision, status, reconciliation,
                    preserve_tenant_overrides, finance_dependency, finance_scopes,
                    published_at, created_at, updated_at
                )
                SELECT
                    'pmr_' || substr(md5('finance:shared/1'), 1, 24),
                    'pm_' || substr(md5('finance:shared'), 1, 24),
                    1, 'published', 'create_missing', true, 'none', '{}',
                    COALESCE(profile.updated_at, extract(epoch FROM now())::bigint),
                    COALESCE(profile.created_at, extract(epoch FROM now())::bigint),
                    COALESCE(profile.updated_at, extract(epoch FROM now())::bigint)
                FROM (SELECT 1) AS singleton
                LEFT JOIN apps AS app ON app.slug = '876-billing'
                LEFT JOIN app_provisioning_profiles AS profile
                    ON profile.app_id = app.id AND profile.is_active;

                INSERT INTO provisioning_manifest_revisions (
                    id, manifest_id, revision, status, reconciliation,
                    preserve_tenant_overrides, finance_dependency, finance_scopes,
                    published_at, created_at, updated_at
                )
                VALUES (
                    'pmr_' || substr(md5('organization:global/1'), 1, 24),
                    'pm_' || substr(md5('organization:global'), 1, 24),
                    1, 'published', 'create_missing', true, 'none', '{}',
                    extract(epoch FROM now())::bigint,
                    extract(epoch FROM now())::bigint,
                    extract(epoch FROM now())::bigint
                );

                INSERT INTO provisioning_resources (
                    id, revision_id, resource_type, key, position, created_at, updated_at
                )
                SELECT
                    resource.id,
                    'pmr_' || substr(md5('finance:shared/1'), 1, 24),
                    resource.resource_type, resource.key, resource.position,
                    resource.created_at, resource.updated_at
                FROM app_provisioning_resources AS resource
                JOIN app_provisioning_profiles AS profile ON profile.id = resource.profile_id
                JOIN apps AS app ON app.id = profile.app_id
                WHERE profile.is_active AND app.slug = '876-billing';

                INSERT INTO provisioning_resources (
                    id, revision_id, resource_type, key, position, created_at, updated_at
                )
                SELECT
                    resource.id,
                    'pmr_' || substr(md5('application:' || app.id || '/1'), 1, 24),
                    resource.resource_type, resource.key, resource.position,
                    resource.created_at, resource.updated_at
                FROM app_provisioning_resources AS resource
                JOIN app_provisioning_profiles AS profile ON profile.id = resource.profile_id
                JOIN apps AS app ON app.id = profile.app_id
                WHERE profile.is_active AND app.slug <> '876-billing';

                INSERT INTO provisioning_properties (
                    id, resource_id, key, value_type, string_value, integer_value,
                    decimal_value, boolean_value, reference_namespace, reference_key,
                    created_at, updated_at
                )
                SELECT
                    property.id, property.resource_id, property.key, property.value_type,
                    property.string_value, property.integer_value, property.decimal_value,
                    property.boolean_value, property.reference_namespace, property.reference_key,
                    property.created_at, property.updated_at
                FROM app_provisioning_properties AS property
                JOIN provisioning_resources AS resource ON resource.id = property.resource_id;

                INSERT INTO provisioning_resources (
                    id, revision_id, resource_type, key, position, created_at, updated_at
                )
                SELECT
                    'pr_' || substr(md5('finance/currency/' || property.reference_key), 1, 24),
                    'pmr_' || substr(md5('finance:shared/1'), 1, 24),
                    'currency', property.reference_key,
                    COALESCE((
                        SELECT MAX(position) + 1
                        FROM provisioning_resources
                        WHERE revision_id = 'pmr_' || substr(md5('finance:shared/1'), 1, 24)
                    ), 0),
                    profile.created_at, profile.updated_at
                FROM app_provisioning_properties AS property
                JOIN app_provisioning_resources AS workspace ON workspace.id = property.resource_id
                JOIN app_provisioning_profiles AS profile ON profile.id = workspace.profile_id
                JOIN apps AS app ON app.id = profile.app_id
                WHERE profile.is_active
                  AND app.slug = '876-billing'
                  AND workspace.resource_type = 'workspace'
                  AND property.key = 'defaultCurrency'
                  AND property.value_type = 'reference'
                  AND NOT EXISTS (
                      SELECT 1 FROM provisioning_resources WHERE resource_type = 'currency'
                  )
                LIMIT 1;

                INSERT INTO provisioning_properties (
                    id, resource_id, key, value_type, string_value, integer_value,
                    decimal_value, boolean_value, reference_namespace, reference_key,
                    created_at, updated_at
                )
                SELECT
                    'pp_' || substr(md5(resource.id || '/code'), 1, 24),
                    resource.id, 'code', 'string', resource.key, NULL, NULL, NULL, NULL, NULL,
                    resource.created_at, resource.updated_at
                FROM provisioning_resources AS resource
                WHERE resource.resource_type = 'currency';

                INSERT INTO provisioning_properties (
                    id, resource_id, key, value_type, string_value, integer_value,
                    decimal_value, boolean_value, reference_namespace, reference_key,
                    created_at, updated_at
                )
                SELECT
                    'pp_' || substr(md5(resource.id || '/name'), 1, 24),
                    resource.id, 'name', 'string', resource.key, NULL, NULL, NULL, NULL, NULL,
                    resource.created_at, resource.updated_at
                FROM provisioning_resources AS resource
                WHERE resource.resource_type = 'currency';

                INSERT INTO provisioning_properties (
                    id, resource_id, key, value_type, string_value, integer_value,
                    decimal_value, boolean_value, reference_namespace, reference_key,
                    created_at, updated_at
                )
                SELECT
                    'pp_' || substr(md5(resource.id || '/minorUnit'), 1, 24),
                    resource.id, 'minorUnit', 'integer', NULL, 2, NULL, NULL, NULL, NULL,
                    resource.created_at, resource.updated_at
                FROM provisioning_resources AS resource
                WHERE resource.resource_type = 'currency';

                INSERT INTO provisioning_steps (
                    id, revision_id, key, description, position, created_at, updated_at
                )
                SELECT
                    step.id,
                    CASE
                        WHEN app.slug = '876-billing'
                            THEN 'pmr_' || substr(md5('finance:shared/1'), 1, 24)
                        ELSE 'pmr_' || substr(md5('application:' || app.id || '/1'), 1, 24)
                    END,
                    step.key, step.description, step.position, step.created_at, step.updated_at
                FROM app_provisioning_steps AS step
                JOIN app_provisioning_profiles AS profile ON profile.id = step.profile_id
                JOIN apps AS app ON app.id = profile.app_id
                WHERE profile.is_active;

                INSERT INTO provisioning_notes (
                    id, manifest_id, body, author_user_id, created_at, updated_at
                )
                SELECT
                    note.id,
                    'pm_' || substr(md5('application:' || note.app_id), 1, 24),
                    note.body, note.author_user_id, note.created_at, note.updated_at
                FROM app_provisioning_notes AS note;
                END $$;
                """
            )
        )

    conn.execute(
        sa_text(
            """
            DO $$
            BEGIN
            DROP TABLE app_provisioning_notes;
            DROP TABLE app_provisioning_properties;
            DROP TABLE app_provisioning_resources;
            DROP TABLE app_provisioning_steps;
            DROP TABLE app_provisioning_profiles;
            END $$;
            """
        )
    )


def ensure_plan_features_cutover(conn: Connection) -> None:
    """Move legacy product-feature grants to their matching modules once."""
    inspector: Any = sa_inspect(conn)
    tables = set(inspector.get_table_names())
    if "plan_features" not in tables:
        return

    required = {"application_modules", "plan_modules"}
    if not required.issubset(tables):
        raise RuntimeError("Plan module tables must be created before the legacy entitlement cutover.")

    conn.execute(
        sa_text(
            """
            INSERT INTO plan_modules (
                id, product_id, module_id, created_at, updated_at
            )
            SELECT
                'pmo_' || substr(md5(grant_.product_id || ':' || module.id), 1, 32),
                grant_.product_id,
                module.id,
                grant_.created_at,
                grant_.updated_at
            FROM plan_features AS grant_
            JOIN application_modules AS module ON module.feature_id = grant_.feature_id
            ON CONFLICT (product_id, module_id) DO NOTHING
            """
        )
    )
    conn.execute(sa_text("DROP TABLE plan_features"))


def ensure_billing_v2(conn: Connection) -> None:
    """One-time cutover from the old ``plans``/``subscriptions.plan_id`` shape

    to the Stripe-normalized ``products``/``prices``/``subscription_items``
    model. Runs before ``products``/``prices``/``subscription_items`` are
    created, so the presence of ``products`` is the "already migrated" guard.
    Flushes the old catalog and every existing subscription — the new shape
    (line items, not a single ``plan_id``) is not data-compatible with it.
    """
    inspector: Any = sa_inspect(conn)
    tables = set(inspector.get_table_names())
    if "products" in tables:
        return
    if "subscriptions" in tables:
        exec_isolated(conn, "billing_v2.truncate_subscriptions", "TRUNCATE TABLE subscriptions RESTART IDENTITY")
    if "plans" in tables:
        exec_isolated(conn, "billing_v2.drop_plans", "DROP TABLE plans CASCADE")


def ensure_subscription_lifecycle_columns(conn: Connection) -> None:
    """Add the Stripe-style lifecycle columns to an existing subscriptions table."""
    inspector: Any = sa_inspect(conn)
    tables = set(inspector.get_table_names())
    if "subscriptions" not in tables:
        return
    columns = {column["name"] for column in inspector.get_columns("subscriptions")}

    if "plan_id" in columns:
        exec_isolated(conn, "subscriptions.drop_plan_id", "ALTER TABLE subscriptions DROP COLUMN plan_id")

    for column in (
        "current_period_start BIGINT",
        "current_period_end BIGINT",
        "cancel_at_period_end BOOLEAN NOT NULL DEFAULT false",
        "canceled_at BIGINT",
        "trial_start BIGINT",
        "trial_end BIGINT",
        "stripe_subscription_id VARCHAR UNIQUE",
    ):
        name = column.split()[0]
        if name not in columns:
            exec_isolated(conn, f"subscriptions.{name}", f"ALTER TABLE subscriptions ADD COLUMN {column}")


def ensure_finance_provisioning_schema(conn: Connection) -> None:
    """Install the lossless subscription revision used by the finance outbox.

    Existing subscriptions start at revision zero, meaning that reconciliation
    has not emitted their first finance lifecycle event. The temporary default
    exists only for the backfill and is removed as part of the same migration.
    """
    inspector: Any = sa_inspect(conn)
    tables = set(inspector.get_table_names())
    if "subscriptions" not in tables:
        return

    columns = {column["name"] for column in inspector.get_columns("subscriptions")}
    if "finance_lifecycle_version" not in columns:
        exec_isolated(
            conn,
            "subscriptions.finance_lifecycle_version.add",
            "ALTER TABLE subscriptions ADD COLUMN finance_lifecycle_version INTEGER DEFAULT 0",
        )

    exec_isolated(
        conn,
        "subscriptions.finance_lifecycle_version.backfill",
        "UPDATE subscriptions SET finance_lifecycle_version = 0 WHERE finance_lifecycle_version IS NULL",
    )
    exec_isolated(
        conn,
        "subscriptions.finance_lifecycle_version.required",
        "ALTER TABLE subscriptions ALTER COLUMN finance_lifecycle_version SET NOT NULL",
    )
    exec_isolated(
        conn,
        "subscriptions.finance_lifecycle_version.no_default",
        "ALTER TABLE subscriptions ALTER COLUMN finance_lifecycle_version DROP DEFAULT",
    )

    exec_isolated(
        conn,
        "subscriptions.finance_lifecycle_index",
        """
        CREATE INDEX IF NOT EXISTS ix_subscriptions_finance_lifecycle_version
            ON subscriptions (finance_lifecycle_version);
        """,
    )

    tables = set(sa_inspect(conn).get_table_names())
    if "finance_provisioning_outbox" not in tables:
        return
    outbox_columns = {
        column["name"] for column in sa_inspect(conn).get_columns("finance_provisioning_outbox")
    }
    if "run_id" not in outbox_columns:
        exec_isolated(
            conn,
            "finance_provisioning_outbox.run_id.add",
            "ALTER TABLE finance_provisioning_outbox ADD COLUMN run_id VARCHAR",
        )
    exec_isolated(
        conn,
        "finance_provisioning_outbox.run_id.unique",
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_provisioning_outbox_run_id
            ON finance_provisioning_outbox (run_id) WHERE run_id IS NOT NULL;
        """,
    )


def ensure_billing_v3_schema(conn: Connection) -> None:
    """Add Stripe-aligned billing V3 columns to existing tables."""
    inspector: Any = sa_inspect(conn)
    tables = set(inspector.get_table_names())

    if "products" in tables:
        columns = {column["name"] for column in inspector.get_columns("products")}
        for col in (
            "active BOOLEAN NOT NULL DEFAULT true",
            "statement_descriptor VARCHAR",
            "unit_label VARCHAR",
            "lookup_key VARCHAR UNIQUE",
            "archived_at BIGINT",
        ):
            name = col.split()[0]
            if name not in columns:
                exec_isolated(conn, f"products.{name}", f"ALTER TABLE products ADD COLUMN {col}")

    if "prices" in tables:
        columns = {column["name"] for column in inspector.get_columns("prices")}
        for col in (
            "name VARCHAR",
            "unit_amount_decimal VARCHAR",
            "lookup_key VARCHAR UNIQUE",
            "nickname VARCHAR",
            "type VARCHAR NOT NULL DEFAULT 'recurring'",
            "billing_scheme VARCHAR NOT NULL DEFAULT 'per_unit'",
            "tiers_mode VARCHAR",
            "tiers JSON",
            "recurring JSON",
            "tax_behavior VARCHAR",
            "transform_quantity JSON",
            "trial_period_days INTEGER",
            "active BOOLEAN NOT NULL DEFAULT true",
            "archived_at BIGINT",
        ):
            name = col.split()[0]
            if name not in columns:
                exec_isolated(conn, f"prices.{name}", f"ALTER TABLE prices ADD COLUMN {col}")

    if "subscriptions" in tables:
        columns = {column["name"] for column in inspector.get_columns("subscriptions")}
        for col in (
            "billing_account_id VARCHAR",
            "provider_status VARCHAR",
            "status_reason VARCHAR",
            "collection_method VARCHAR NOT NULL DEFAULT 'charge_automatically'",
            "billing_cycle_anchor BIGINT",
            "cancel_at BIGINT",
            "ended_at BIGINT",
            "pause_collection JSON",
            "start_date BIGINT",
            "default_payment_method_id VARCHAR",
            "latest_invoice_id VARCHAR",
            "pending_update JSON",
            "schedule_id VARCHAR",
        ):
            name = col.split()[0]
            if name not in columns:
                exec_isolated(conn, f"subscriptions.{name}", f"ALTER TABLE subscriptions ADD COLUMN {col}")

    if "subscription_items" in tables:
        columns = {column["name"] for column in inspector.get_columns("subscription_items")}
        for col in (
            "billing_thresholds JSON",
            "metadata JSON",
        ):
            name = col.split()[0]
            if name not in columns:
                exec_isolated(conn, f"subscription_items.{name}", f"ALTER TABLE subscription_items ADD COLUMN {col}")


def ensure_tax_catalog_schema(conn: Connection) -> None:
    """Create Stripe-aligned tax catalog tables and product tax-code reference."""
    inspector: Any = sa_inspect(conn)
    tables = set(inspector.get_table_names())

    if "tax_codes" not in tables:
        exec_isolated(
            conn,
            "tax_codes.create",
            """
            CREATE TABLE tax_codes (
                id VARCHAR PRIMARY KEY,
                name VARCHAR NOT NULL,
                description TEXT,
                requirements JSON,
                active BOOLEAN NOT NULL DEFAULT true,
                created_at BIGINT NOT NULL,
                updated_at BIGINT NOT NULL
            )
            """,
        )

    if "tax_rates" not in tables:
        exec_isolated(
            conn,
            "tax_rates.create",
            """
            CREATE TABLE tax_rates (
                id VARCHAR PRIMARY KEY,
                display_name VARCHAR NOT NULL,
                description TEXT,
                percentage FLOAT NOT NULL,
                inclusive BOOLEAN NOT NULL DEFAULT false,
                active BOOLEAN NOT NULL DEFAULT true,
                country VARCHAR(2),
                state VARCHAR,
                jurisdiction VARCHAR,
                jurisdiction_level VARCHAR,
                tax_type VARCHAR,
                rate_type VARCHAR,
                flat_amount JSON,
                metadata JSON,
                created_at BIGINT NOT NULL,
                updated_at BIGINT NOT NULL
            )
            """,
        )

    inspector = sa_inspect(conn)
    tables = set(inspector.get_table_names())
    if "products" not in tables:
        return

    columns = {column["name"] for column in inspector.get_columns("products")}
    if "tax_code_id" not in columns:
        exec_isolated(
            conn,
            "products.tax_code_id",
            "ALTER TABLE products ADD COLUMN tax_code_id VARCHAR",
        )
    exec_isolated(
        conn,
        "products.tax_code_id.fk",
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'fk_products_tax_code_id_tax_codes'
            ) THEN
                ALTER TABLE products
                ADD CONSTRAINT fk_products_tax_code_id_tax_codes
                FOREIGN KEY (tax_code_id) REFERENCES tax_codes(id) ON DELETE SET NULL;
            END IF;
        END $$;
        """,
    )
    exec_isolated(
        conn,
        "products.tax_code_id.index",
        "CREATE INDEX IF NOT EXISTS ix_products_tax_code_id ON products (tax_code_id)",
    )


def backfill_billing_v3_data(conn: Connection) -> None:
    """Backfill data for the new billing schema."""
    inspector: Any = sa_inspect(conn)
    tables = set(inspector.get_table_names())

    if "products" in tables:
        exec_isolated(conn, "products.backfill_active", "UPDATE products SET active = (status = 'active')")

    if "prices" in tables:
        exec_isolated(conn, "prices.backfill_active", "UPDATE prices SET active = (status = 'active')")
        exec_isolated(
            conn,
            "prices.backfill_recurring",
            """
            UPDATE prices
            SET recurring = json_build_object('interval', billing_interval, 'interval_count', interval_count)
            WHERE billing_interval IS NOT NULL AND recurring IS NULL
            """,
        )

    if "billing_accounts" in tables and "organizations" in tables:
        exec_isolated(
            conn,
            "billing_accounts.backfill",
            """
            INSERT INTO billing_accounts (
                id, organization_id, name, email, balance, created_at, updated_at
            )
            SELECT
                'ba_' || substr(md5(random()::text), 1, 24),
                id, name, primary_email, 0, created_at, updated_at
            FROM organizations
            WHERE NOT EXISTS (
                SELECT 1 FROM billing_accounts WHERE billing_accounts.organization_id = organizations.id
            )
            """,
        )

    if "subscriptions" in tables and "billing_accounts" in tables:
        exec_isolated(
            conn,
            "subscriptions.backfill_billing_account_id",
            """
            UPDATE subscriptions
            SET billing_account_id = billing_accounts.id
            FROM billing_accounts
            WHERE subscriptions.organization_id = billing_accounts.organization_id
            AND subscriptions.billing_account_id IS NULL
            """,
        )


def ensure_organizations_stripe_customer_id(conn: Connection) -> None:
    inspector: Any = sa_inspect(conn)
    tables = set(inspector.get_table_names())
    if "organizations" not in tables:
        return
    columns = {column["name"] for column in inspector.get_columns("organizations")}
    if "stripe_customer_id" in columns:
        return
    exec_isolated(
        conn,
        "organizations.stripe_customer_id",
        "ALTER TABLE organizations ADD COLUMN stripe_customer_id VARCHAR UNIQUE",
    )


def exec_isolated(
    conn: Connection,
    label: str,
    statement: str,
    params: dict[str, Any] | None = None,
) -> None:
    """Run one idempotent schema statement inside its own savepoint.

    Each statement is independent and self-guarded, so a single failure must not
    roll back the others - most importantly the critical column adds the ORM
    depends on (e.g. ``users.platform_role``; a missing column makes every
    full-row user query 500, which historically surfaced as a misleading
    "no Console profile"). The failure is logged rather than swallowed.

    ``params`` are passed as bound parameters (use ``:name`` placeholders in
    ``statement``) so values like the configured owner email are never
    interpolated into the SQL text.
    """
    try:
        with conn.begin_nested():
            conn.execute(sa_text(statement), params or {})
    except Exception:
        logger.error("db.migrate.statement_failed", label=label, exc_info=True)


def ensure_org_business_identity_columns(conn: Connection) -> None:
    """Add the business-identity/locale columns to an existing organizations table."""
    inspector: Any = sa_inspect(conn)
    tables = set(inspector.get_table_names())
    if "organizations" not in tables:
        return
    columns = {column["name"] for column in inspector.get_columns("organizations")}

    for column in (
        "doing_business_as VARCHAR",
        "industry VARCHAR",
        "business_type VARCHAR",
        "registration_number VARCHAR",
        "trn VARCHAR",
        "nis_number VARCHAR",
        "gct_number VARCHAR",
        "tax_id VARCHAR",
        "incorporation_date VARCHAR",
        "fax VARCHAR",
        "primary_contact_user_id VARCHAR",
        "timezone VARCHAR",
        "language VARCHAR",
    ):
        name = column.split()[0]
        if name not in columns:
            exec_isolated(conn, f"organizations.{name}", f"ALTER TABLE organizations ADD COLUMN {column}")


def ensure_invite_source_app_column(conn: Connection) -> None:
    """Add the source_app_id column to an existing invite_tokens table."""
    inspector: Any = sa_inspect(conn)
    tables = set(inspector.get_table_names())
    if "invite_tokens" not in tables:
        return
    columns = {column["name"] for column in inspector.get_columns("invite_tokens")}
    if "source_app_id" in columns:
        return
    exec_isolated(
        conn,
        "invite_tokens.source_app_id",
        "ALTER TABLE invite_tokens ADD COLUMN source_app_id VARCHAR",
    )


def ensure_feature_flag_provider_columns(conn: Connection) -> None:
    """Add provider-neutral feature flag columns to an existing features table."""
    inspector: Any = sa_inspect(conn)
    tables = set(inspector.get_table_names())
    if "features" not in tables:
        return
    columns = {column["name"] for column in inspector.get_columns("features")}

    for column in (
        "provider VARCHAR NOT NULL DEFAULT 'posthog'",
        "provider_feature_id VARCHAR",
        "provider_environment_id VARCHAR",
        "value_type VARCHAR",
        "value JSON",
        "server_side_only BOOLEAN NOT NULL DEFAULT true",
        "archived_at BIGINT",
        "parent_feature_id VARCHAR",
        "provider_metadata JSON",
    ):
        name = column.split()[0]
        if name not in columns:
            exec_isolated(conn, f"features.{name}", f"ALTER TABLE features ADD COLUMN {column}")

    exec_isolated(
        conn,
        "features.provider_feature_id.index",
        "CREATE INDEX IF NOT EXISTS ix_features_provider_feature_id ON features (provider_feature_id)",
    )
    exec_isolated(
        conn,
        "features.parent_feature_id.fk",
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'fk_features_parent_feature_id_features'
            ) THEN
                ALTER TABLE features
                ADD CONSTRAINT fk_features_parent_feature_id_features
                FOREIGN KEY (parent_feature_id) REFERENCES features(id) ON DELETE SET NULL;
            END IF;
        END $$;
        """,
    )
    exec_isolated(
        conn,
        "features.parent_feature_id.index",
        "CREATE INDEX IF NOT EXISTS ix_features_parent_feature_id ON features (parent_feature_id)",
    )


def ensure_user_profile_country_column(conn: Connection) -> None:
    """Add the country_code column to an existing user_profiles table."""
    inspector: Any = sa_inspect(conn)
    tables = set(inspector.get_table_names())
    if "user_profiles" not in tables:
        return
    columns = {column["name"] for column in inspector.get_columns("user_profiles")}
    if "country_code" in columns:
        return
    exec_isolated(
        conn,
        "user_profiles.country_code",
        "ALTER TABLE user_profiles ADD COLUMN country_code VARCHAR(2)",
    )


def ensure_indexes(conn: Connection) -> None:
    """Create foreign-key lookup indexes on existing tables.

    ``Base.metadata.create_all`` only creates *missing tables*; it does not add
    new indexes to tables that already exist. These match the ORM ``index=True``
    declarations (default name ``ix_<table>_<column>``), so fresh databases get
    them from ``create_all`` and this DDL is a no-op there. Without them, listing
    or revoking a user's accounts/sessions is a full table scan.
    """
    inspector: Any = sa_inspect(conn)
    tables = set(inspector.get_table_names())

    for table, column in (("accounts", "user_id"), ("sessions", "user_id")):
        if table not in tables:
            continue
        exec_isolated(
            conn,
            f"index.{table}.{column}",
            f"CREATE INDEX IF NOT EXISTS ix_{table}_{column} ON {table} ({column})",
        )


def ensure_identity_columns(conn: Connection) -> None:
    inspector: Any = sa_inspect(conn)
    tables = set(inspector.get_table_names())

    if "user_contacts" in tables and "contacts" not in tables:
        exec_isolated(conn, "rename_user_contacts", "ALTER TABLE user_contacts RENAME TO contacts")
        inspector = sa_inspect(conn)
        tables = set(inspector.get_table_names())

    if "organization_app_access" in tables and "subscriptions" not in tables:
        exec_isolated(
            conn,
            "rename_organization_app_access",
            "ALTER TABLE organization_app_access RENAME TO subscriptions",
        )
        inspector = sa_inspect(conn)
        tables = set(inspector.get_table_names())

    columns_by_table = {
        table: {column["name"] for column in inspector.get_columns(table)}
        for table in (
            "users",
            "apps",
            "organizations",
            "memberships",
            "accounts",
            "contacts",
        )
        if table in tables
    }

    if "users" in columns_by_table:
        if "platform_role" not in columns_by_table["users"]:
            exec_isolated(
                conn,
                "users.platform_role",
                "ALTER TABLE users ADD COLUMN platform_role VARCHAR",
            )
        for column in ("deleted_at BIGINT", "deleted_by VARCHAR", "deletion_reason TEXT"):
            name = column.split()[0]
            if name not in columns_by_table["users"]:
                exec_isolated(conn, f"users.{name}", f"ALTER TABLE users ADD COLUMN {column}")

    for table in ("apps", "organizations", "memberships", "contacts"):
        if table not in columns_by_table:
            continue
        for column in ("deleted_at BIGINT", "deleted_by VARCHAR", "deletion_reason TEXT"):
            name = column.split()[0]
            if name not in columns_by_table[table]:
                exec_isolated(conn, f"{table}.{name}", f"ALTER TABLE {table} ADD COLUMN {column}")

    if "apps" in columns_by_table and "owner_user_id" in columns_by_table["apps"]:
        exec_isolated(conn, "apps.drop_owner_user_id", "ALTER TABLE apps DROP COLUMN owner_user_id")

    if "memberships" in columns_by_table and "role_id" not in columns_by_table["memberships"]:
        exec_isolated(conn, "memberships.role_id", "ALTER TABLE memberships ADD COLUMN role_id VARCHAR")

    if "accounts" in columns_by_table:
        exec_isolated(
            conn,
            "accounts.normalize_provider_id",
            """
            UPDATE accounts
            SET provider_id = CASE provider_id
                WHEN 'GoogleOAuth' THEN 'google'
                WHEN 'AppleOAuth' THEN 'apple'
                WHEN 'MicrosoftOAuth' THEN 'microsoft'
                WHEN 'GitHubOAuth' THEN 'github'
                WHEN 'GitLabOAuth' THEN 'gitlab'
                WHEN 'LinkedInOAuth' THEN 'linkedin'
                WHEN 'SlackOAuth' THEN 'slack'
                ELSE provider_id
            END
            """,
        )

    if "users" in columns_by_table:
        owner_email = get_settings().platform_owner_email.strip().lower()
        if owner_email:
            exec_isolated(
                conn,
                "users.seed_owner",
                "UPDATE users SET platform_role = 'owner', role = 'owner' WHERE lower(email) = :owner_email",
                {"owner_email": owner_email},
            )
