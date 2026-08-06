-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "accounts" (
    "id" VARCHAR NOT NULL,
    "user_id" VARCHAR NOT NULL,
    "account_id" VARCHAR NOT NULL,
    "provider_id" VARCHAR NOT NULL,
    "provider_type" VARCHAR NOT NULL DEFAULT 'oauth',
    "access_token" TEXT,
    "refresh_token" TEXT,
    "access_token_expires_at" BIGINT,
    "refresh_token_expires_at" BIGINT,
    "scope" VARCHAR,
    "id_token" TEXT,
    "password" VARCHAR,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" VARCHAR NOT NULL,
    "user_id" VARCHAR,
    "organization_id" VARCHAR,
    "type" VARCHAR NOT NULL DEFAULT 'other',
    "label" VARCHAR,
    "line1" VARCHAR,
    "line2" VARCHAR,
    "city" VARCHAR,
    "region_id" VARCHAR,
    "country_code" VARCHAR(2),
    "postal_code" VARCHAR,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" VARCHAR NOT NULL,
    "app_id" VARCHAR NOT NULL,
    "key_hash" VARCHAR NOT NULL,
    "name" VARCHAR,
    "last_used_at" BIGINT,
    "expires_at" BIGINT,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" BIGINT NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_assignments" (
    "id" VARCHAR NOT NULL,
    "organization_id" VARCHAR NOT NULL,
    "user_id" VARCHAR NOT NULL,
    "app_id" VARCHAR NOT NULL,
    "status" VARCHAR NOT NULL DEFAULT 'active',
    "assigned_by" VARCHAR,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "app_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apps" (
    "id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "slug" VARCHAR NOT NULL,
    "organization_id" VARCHAR,
    "client_id" VARCHAR NOT NULL,
    "client_secret_hash" VARCHAR,
    "client_type" VARCHAR NOT NULL DEFAULT 'public',
    "app_kind" VARCHAR NOT NULL DEFAULT 'external',
    "status" VARCHAR NOT NULL DEFAULT 'active',
    "allowed_redirect_uris" VARCHAR[],
    "allowed_logout_uris" VARCHAR[] DEFAULT ARRAY[]::VARCHAR[],
    "logo_url" VARCHAR,
    "homepage_url" VARCHAR,
    "type" VARCHAR NOT NULL DEFAULT 'web',
    "scopes_allowed" VARCHAR[] DEFAULT ARRAY['openid', 'profile', 'email']::VARCHAR[],
    "deleted_at" BIGINT,
    "deleted_by" VARCHAR,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "logo_file_id" VARCHAR,

    CONSTRAINT "apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_modules" (
    "id" VARCHAR NOT NULL,
    "app_id" VARCHAR NOT NULL,
    "key" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "description" TEXT,
    "feature_id" VARCHAR,
    "status" VARCHAR NOT NULL DEFAULT 'active',
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "application_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" VARCHAR NOT NULL,
    "event" VARCHAR NOT NULL,
    "source" VARCHAR NOT NULL DEFAULT 'client',
    "app_name" VARCHAR NOT NULL,
    "app_id" VARCHAR,
    "user_id" VARCHAR,
    "path" VARCHAR,
    "search" VARCHAR,
    "referrer" TEXT,
    "title" VARCHAR,
    "request_id" VARCHAR,
    "session_id" VARCHAR,
    "distinct_id" VARCHAR,
    "properties" JSON NOT NULL DEFAULT '{}',
    "created_at" BIGINT NOT NULL,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_attempts" (
    "id" VARCHAR NOT NULL,
    "event" VARCHAR NOT NULL,
    "outcome" VARCHAR NOT NULL,
    "failure_code" VARCHAR,
    "identifier" VARCHAR,
    "user_id" VARCHAR,
    "app_id" VARCHAR,
    "session_id" VARCHAR,
    "realm" VARCHAR,
    "device_id" VARCHAR,
    "device_fingerprint" VARCHAR,
    "ip_address" VARCHAR,
    "ip_country_code" VARCHAR(2),
    "ip_region_code" VARCHAR,
    "ip_region" VARCHAR,
    "ip_city" VARCHAR,
    "ip_postal_code" VARCHAR,
    "ip_timezone" VARCHAR,
    "ip_latitude" VARCHAR,
    "ip_longitude" VARCHAR,
    "ip_asn" VARCHAR,
    "ip_as_organization" VARCHAR,
    "user_agent" TEXT,
    "device_type" VARCHAR,
    "device_brand" VARCHAR,
    "device_model" VARCHAR,
    "os_name" VARCHAR,
    "os_version" VARCHAR,
    "browser_name" VARCHAR,
    "browser_version" VARCHAR,
    "is_bot" BOOLEAN NOT NULL DEFAULT false,
    "context_trusted" BOOLEAN NOT NULL DEFAULT false,
    "risk_score" INTEGER,
    "risk_reasons" JSON,
    "request_id" VARCHAR,
    "created_at" BIGINT NOT NULL,

    CONSTRAINT "auth_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_email_otps" (
    "email" VARCHAR NOT NULL,
    "pending_auth_token" VARCHAR NOT NULL,
    "email_verification_id" VARCHAR NOT NULL,
    "workos_user_id" VARCHAR,
    "last_sent_at" BIGINT,
    "can_resend_at" BIGINT,
    "expires_at" BIGINT NOT NULL,
    "send_count" INTEGER NOT NULL DEFAULT 0,
    "verified_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "auth_email_otps_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "auth_providers" (
    "id" VARCHAR NOT NULL,
    "label" VARCHAR NOT NULL,
    "icon_slug" VARCHAR NOT NULL,
    "provider_type" VARCHAR NOT NULL DEFAULT 'oauth',
    "workos_provider_id" VARCHAR,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "auth_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authorization_codes" (
    "id" VARCHAR NOT NULL,
    "code_hash" VARCHAR NOT NULL,
    "user_id" VARCHAR NOT NULL,
    "app_id" VARCHAR NOT NULL,
    "org_id" VARCHAR,
    "redirect_uri" VARCHAR NOT NULL,
    "code_challenge" VARCHAR NOT NULL,
    "code_challenge_method" VARCHAR NOT NULL DEFAULT 'S256',
    "scope" VARCHAR NOT NULL,
    "state" VARCHAR,
    "nonce" VARCHAR,
    "auth_time" BIGINT NOT NULL,
    "expires_at" BIGINT NOT NULL,
    "used_at" BIGINT,
    "created_at" BIGINT NOT NULL,

    CONSTRAINT "authorization_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" VARCHAR NOT NULL,
    "account_holder" VARCHAR NOT NULL,
    "bank_id" VARCHAR NOT NULL,
    "branch_id" VARCHAR,
    "account_number" VARCHAR NOT NULL,
    "account_type" VARCHAR NOT NULL DEFAULT 'savings',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'JMD',
    "deleted_at" BIGINT,
    "deleted_by" VARCHAR,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_branches" (
    "id" VARCHAR NOT NULL,
    "bank_id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "transit_number" VARCHAR NOT NULL,
    "routing_number" VARCHAR,
    "address_id" VARCHAR NOT NULL,
    "contact_number" VARCHAR,
    "operating_hours" VARCHAR,
    "deleted_at" BIGINT,
    "deleted_by" VARCHAR,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "bank_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banks" (
    "id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "short_name" VARCHAR,
    "bank_code" VARCHAR NOT NULL,
    "swift_code" VARCHAR,
    "logo_url" VARCHAR,
    "head_office" VARCHAR,
    "website" VARCHAR,
    "deleted_at" BIGINT,
    "deleted_by" VARCHAR,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_accounts" (
    "id" VARCHAR NOT NULL,
    "organization_id" VARCHAR NOT NULL,
    "name" VARCHAR,
    "email" VARCHAR,
    "invoice_email" VARCHAR,
    "currency" VARCHAR(3) DEFAULT 'JMD',
    "tax_exempt" VARCHAR,
    "balance" BIGINT NOT NULL DEFAULT 0,
    "default_payment_method_id" VARCHAR,
    "invoice_settings" JSON,
    "preferred_locales" JSON,
    "address" JSON,
    "shipping" JSON,
    "metadata" JSON,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "billing_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_customer_outbox" (
    "id" VARCHAR NOT NULL,
    "event_type" VARCHAR NOT NULL,
    "subject_type" VARCHAR NOT NULL,
    "subject_id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "email" VARCHAR,
    "occurred_at" BIGINT NOT NULL,
    "status" VARCHAR NOT NULL,
    "attempt_count" INTEGER NOT NULL,
    "available_at" BIGINT NOT NULL,
    "locked_at" BIGINT,
    "delivered_at" BIGINT,
    "last_error" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "customer_kind" VARCHAR,
    "company_name" VARCHAR,
    "first_name" VARCHAR,
    "last_name" VARCHAR,
    "phone" VARCHAR,
    "contact_user_id" VARCHAR,
    "contact_first_name" VARCHAR,
    "contact_last_name" VARCHAR,
    "contact_email" VARCHAR,
    "contact_phone" VARCHAR,
    "payload_hash" VARCHAR,

    CONSTRAINT "billing_customer_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_provider_objects" (
    "id" VARCHAR NOT NULL,
    "provider" VARCHAR NOT NULL,
    "provider_object_type" VARCHAR NOT NULL,
    "provider_object_id" VARCHAR NOT NULL,
    "internal_object_type" VARCHAR NOT NULL,
    "internal_object_id" VARCHAR NOT NULL,
    "livemode" BOOLEAN NOT NULL DEFAULT false,
    "synced_at" BIGINT,
    "raw_payload" JSON,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "billing_provider_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_messages" (
    "id" VARCHAR NOT NULL,
    "provider" VARCHAR NOT NULL,
    "provider_sid" VARCHAR,
    "channel" VARCHAR NOT NULL,
    "direction" VARCHAR NOT NULL DEFAULT 'outbound',
    "status" VARCHAR NOT NULL,
    "to_number" VARCHAR NOT NULL,
    "from_number" VARCHAR,
    "messaging_service_sid" VARCHAR,
    "content_sid" VARCHAR,
    "body_preview" VARCHAR(160),
    "body_hash" VARCHAR(64) NOT NULL,
    "user_id" VARCHAR,
    "organization_id" VARCHAR,
    "app_id" VARCHAR,
    "client_reference" VARCHAR,
    "idempotency_key" VARCHAR NOT NULL,
    "provider_error_code" VARCHAR,
    "sent_at" BIGINT,
    "delivered_at" BIGINT,
    "read_at" BIGINT,
    "failed_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "communication_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_phone_lookups" (
    "number" VARCHAR NOT NULL,
    "valid" BOOLEAN NOT NULL,
    "e164" VARCHAR,
    "national_format" VARCHAR,
    "country_code" VARCHAR(2),
    "carrier_name" VARCHAR,
    "line_type" VARCHAR,
    "mobile_country_code" VARCHAR,
    "mobile_network_code" VARCHAR,
    "line_type_requested" BOOLEAN NOT NULL DEFAULT false,
    "created_at" BIGINT NOT NULL,

    CONSTRAINT "communication_phone_lookups_pkey" PRIMARY KEY ("number")
);

-- CreateTable
CREATE TABLE "communication_webhook_events" (
    "id" VARCHAR NOT NULL,
    "provider" VARCHAR NOT NULL,
    "event_type" VARCHAR NOT NULL,
    "provider_sid" VARCHAR NOT NULL,
    "payload_hash" VARCHAR(64) NOT NULL,
    "signature_valid" BOOLEAN NOT NULL,
    "processed_at" BIGINT,
    "processing_error" TEXT,
    "created_at" BIGINT NOT NULL,

    CONSTRAINT "communication_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" VARCHAR NOT NULL,
    "owner_user_id" VARCHAR NOT NULL,
    "contact_user_id" VARCHAR NOT NULL,
    "nickname" VARCHAR,
    "notes" TEXT,
    "deleted_at" BIGINT,
    "deleted_by" VARCHAR,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "code" VARCHAR(2) NOT NULL,
    "name" VARCHAR NOT NULL,
    "phone_prefix" VARCHAR,
    "default_currency_code" VARCHAR(3),
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "credit_union_branches" (
    "id" VARCHAR NOT NULL,
    "credit_union_id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "address_id" VARCHAR NOT NULL,
    "contact_number" VARCHAR,
    "email" VARCHAR,
    "deleted_at" BIGINT,
    "deleted_by" VARCHAR,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "credit_union_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_unions" (
    "id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "short_name" VARCHAR,
    "logo_url" VARCHAR,
    "headquarters" VARCHAR,
    "deleted_at" BIGINT,
    "deleted_by" VARCHAR,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "credit_unions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "code" VARCHAR(3) NOT NULL,
    "name" VARCHAR NOT NULL,
    "symbol" VARCHAR NOT NULL,
    "decimal_places" INTEGER NOT NULL DEFAULT 2,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "directory_addresses" (
    "id" VARCHAR NOT NULL,
    "line1" VARCHAR NOT NULL,
    "line2" VARCHAR,
    "city" VARCHAR NOT NULL,
    "state" VARCHAR NOT NULL,
    "postal_code" VARCHAR,
    "country" VARCHAR(2) NOT NULL DEFAULT 'JM',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "directory_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_profiles" (
    "id" VARCHAR NOT NULL,
    "membership_id" VARCHAR NOT NULL,
    "organization_id" VARCHAR NOT NULL,
    "employee_number" VARCHAR,
    "job_title" VARCHAR,
    "department_id" VARCHAR,
    "location_id" VARCHAR,
    "manager_membership_id" VARCHAR,
    "employment_type" VARCHAR,
    "employment_status" VARCHAR NOT NULL DEFAULT 'active',
    "division" VARCHAR,
    "cost_center" VARCHAR,
    "work_email" VARCHAR,
    "work_phone" VARCHAR,
    "start_date" BIGINT,
    "end_date" BIGINT,
    "metadata" JSON,
    "deleted_at" BIGINT,
    "deleted_by" VARCHAR,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "employee_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flag_migration_archives" (
    "id" VARCHAR NOT NULL,
    "source_provider" VARCHAR NOT NULL,
    "target_provider" VARCHAR NOT NULL,
    "checksum" VARCHAR NOT NULL,
    "status" VARCHAR NOT NULL DEFAULT 'captured',
    "counts" JSON NOT NULL,
    "snapshot" JSON NOT NULL,
    "result" JSON,
    "created_at" BIGINT NOT NULL,
    "completed_at" BIGINT,

    CONSTRAINT "feature_flag_migration_archives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "features" (
    "id" VARCHAR NOT NULL,
    "provider" VARCHAR NOT NULL DEFAULT 'flagsmith',
    "provider_feature_id" VARCHAR,
    "provider_environment_id" VARCHAR,
    "slug" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "description" TEXT,
    "tags" VARCHAR[] DEFAULT ARRAY[]::VARCHAR[],
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "default_value" BOOLEAN NOT NULL DEFAULT false,
    "value_type" VARCHAR,
    "value" JSON,
    "server_side_only" BOOLEAN NOT NULL DEFAULT true,
    "archived_at" BIGINT,
    "parent_feature_id" VARCHAR,
    "provider_metadata" JSON,
    "consumer_default_enabled" BOOLEAN NOT NULL DEFAULT false,
    "scope" VARCHAR NOT NULL DEFAULT 'global',
    "app_id" VARCHAR,
    "synced_at" BIGINT NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_provisioning_outbox" (
    "id" VARCHAR NOT NULL,
    "event_type" VARCHAR NOT NULL,
    "contract_version" INTEGER NOT NULL,
    "aggregate_id" VARCHAR NOT NULL,
    "organization_id" VARCHAR NOT NULL,
    "organization_name" VARCHAR NOT NULL,
    "organization_slug" VARCHAR NOT NULL,
    "organization_country_code" VARCHAR(2),
    "organization_currency_code" VARCHAR(3) NOT NULL,
    "source_app_id" VARCHAR NOT NULL,
    "entitlement_reference" VARCHAR NOT NULL,
    "provisioning_version" INTEGER NOT NULL,
    "lifecycle_version" INTEGER NOT NULL,
    "desired_status" VARCHAR NOT NULL,
    "scopes" VARCHAR[],
    "occurred_at" BIGINT NOT NULL,
    "status" VARCHAR NOT NULL,
    "attempt_count" INTEGER NOT NULL,
    "available_at" BIGINT NOT NULL,
    "locked_at" BIGINT,
    "delivered_at" BIGINT,
    "last_error" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "run_id" VARCHAR,

    CONSTRAINT "finance_provisioning_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_tokens" (
    "id" VARCHAR NOT NULL,
    "organization_id" VARCHAR NOT NULL,
    "email" VARCHAR NOT NULL,
    "role" VARCHAR NOT NULL DEFAULT 'member',
    "token" VARCHAR NOT NULL,
    "status" VARCHAR NOT NULL DEFAULT 'pending',
    "expires_at" BIGINT NOT NULL,
    "source_app_id" VARCHAR,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "invite_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" VARCHAR NOT NULL,
    "organization_id" VARCHAR NOT NULL,
    "user_id" VARCHAR NOT NULL,
    "workos_membership_id" VARCHAR,
    "role_id" VARCHAR,
    "role" VARCHAR NOT NULL DEFAULT 'member',
    "status" VARCHAR NOT NULL DEFAULT 'active',
    "deleted_at" BIGINT,
    "deleted_by" VARCHAR,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ministry_departments" (
    "id" VARCHAR NOT NULL,
    "ministry_id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "description" TEXT,
    "address_id" VARCHAR NOT NULL,
    "contact_email" VARCHAR,
    "contact_number" VARCHAR,
    "deleted_at" BIGINT,
    "deleted_by" VARCHAR,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "ministry_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ministries" (
    "id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "portfolio" VARCHAR,
    "minister" VARCHAR,
    "website" VARCHAR,
    "deleted_at" BIGINT,
    "deleted_by" VARCHAR,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "ministries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_grants" (
    "id" VARCHAR NOT NULL,
    "user_id" VARCHAR NOT NULL,
    "app_id" VARCHAR NOT NULL,
    "scopes" VARCHAR[],
    "revoked_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "oauth_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_refresh_tokens" (
    "id" VARCHAR NOT NULL,
    "token_hash" VARCHAR NOT NULL,
    "user_id" VARCHAR NOT NULL,
    "app_id" VARCHAR NOT NULL,
    "session_id" VARCHAR,
    "scope" VARCHAR NOT NULL,
    "expires_at" BIGINT NOT NULL,
    "used_at" BIGINT,
    "revoked_at" BIGINT,
    "created_at" BIGINT NOT NULL,

    CONSTRAINT "oauth_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_answers" (
    "id" VARCHAR NOT NULL,
    "session_id" VARCHAR NOT NULL,
    "field_key" VARCHAR NOT NULL,
    "value" JSON,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "onboarding_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_sessions" (
    "id" VARCHAR NOT NULL,
    "organization_id" VARCHAR NOT NULL,
    "target_type" VARCHAR NOT NULL,
    "target_key" VARCHAR NOT NULL,
    "country_code" VARCHAR(2) NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "catalog_revision" INTEGER NOT NULL,
    "status" VARCHAR NOT NULL DEFAULT 'draft',
    "submitted_at" BIGINT,
    "completed_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "onboarding_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_contacts" (
    "id" VARCHAR NOT NULL,
    "organization_id" VARCHAR NOT NULL,
    "user_id" VARCHAR,
    "first_name" VARCHAR NOT NULL,
    "last_name" VARCHAR,
    "title" VARCHAR,
    "type" VARCHAR NOT NULL DEFAULT 'general',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "email" VARCHAR,
    "phone" VARCHAR,
    "mobile" VARCHAR,
    "notes" TEXT,
    "metadata" JSON,
    "deleted_at" BIGINT,
    "deleted_by" VARCHAR,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "org_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_departments" (
    "id" VARCHAR NOT NULL,
    "organization_id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "code" VARCHAR,
    "description" TEXT,
    "parent_department_id" VARCHAR,
    "head_membership_id" VARCHAR,
    "status" VARCHAR NOT NULL DEFAULT 'active',
    "metadata" JSON,
    "deleted_at" BIGINT,
    "deleted_by" VARCHAR,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "org_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_features" (
    "id" VARCHAR NOT NULL,
    "organization_id" VARCHAR NOT NULL,
    "feature_id" VARCHAR NOT NULL,
    "status" VARCHAR NOT NULL DEFAULT 'enabled',
    "note" VARCHAR,
    "synced_at" BIGINT NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "org_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_locations" (
    "id" VARCHAR NOT NULL,
    "organization_id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "code" VARCHAR,
    "type" VARCHAR NOT NULL DEFAULT 'office',
    "status" VARCHAR NOT NULL DEFAULT 'active',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "phone" VARCHAR,
    "email" VARCHAR,
    "line1" VARCHAR,
    "line2" VARCHAR,
    "city" VARCHAR,
    "region_id" VARCHAR,
    "country_code" VARCHAR(2),
    "postal_code" VARCHAR,
    "timezone" VARCHAR,
    "metadata" JSON,
    "deleted_at" BIGINT,
    "deleted_by" VARCHAR,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "org_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_roles" (
    "id" VARCHAR NOT NULL,
    "organization_id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "display_name" VARCHAR NOT NULL,
    "description" TEXT,
    "permissions" VARCHAR[] DEFAULT ARRAY[]::VARCHAR[],
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "organization_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" VARCHAR NOT NULL,
    "workos_organization_id" VARCHAR,
    "name" VARCHAR,
    "short_name" VARCHAR,
    "doing_business_as" VARCHAR,
    "slug" VARCHAR NOT NULL,
    "status" VARCHAR NOT NULL DEFAULT 'active',
    "logo_url" VARCHAR,
    "industry" VARCHAR,
    "business_type" VARCHAR,
    "registration_number" VARCHAR,
    "trn" VARCHAR,
    "nis_number" VARCHAR,
    "gct_number" VARCHAR,
    "tax_id" VARCHAR,
    "incorporation_date" VARCHAR,
    "primary_phone" VARCHAR,
    "primary_email" VARCHAR,
    "fax" VARCHAR,
    "website_url" VARCHAR,
    "support_url" VARCHAR,
    "primary_contact_user_id" VARCHAR,
    "timezone" VARCHAR,
    "language" VARCHAR,
    "address_line1" VARCHAR,
    "address_line2" VARCHAR,
    "city" VARCHAR,
    "region_id" VARCHAR,
    "country_code" VARCHAR(2),
    "currency_code" VARCHAR(3) DEFAULT 'JMD',
    "enrollment_completed_at" BIGINT,
    "metadata" JSON,
    "deleted_at" BIGINT,
    "deleted_by" VARCHAR,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "stripe_customer_id" VARCHAR,
    "logo_file_id" VARCHAR,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_modules" (
    "id" VARCHAR NOT NULL,
    "product_id" VARCHAR NOT NULL,
    "module_id" VARCHAR NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "plan_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_bootstrap_state" (
    "step" VARCHAR(100) NOT NULL,
    "revision" INTEGER NOT NULL,
    "completed_at" BIGINT NOT NULL,

    CONSTRAINT "platform_bootstrap_state_pkey" PRIMARY KEY ("step")
);

-- CreateTable
CREATE TABLE "prices" (
    "id" VARCHAR NOT NULL,
    "product_id" VARCHAR NOT NULL,
    "billing_interval" VARCHAR,
    "interval_count" INTEGER,
    "status" VARCHAR NOT NULL DEFAULT 'active',
    "unit_amount" BIGINT,
    "unit_amount_decimal" VARCHAR,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'jmd',
    "lookup_key" VARCHAR,
    "name" VARCHAR,
    "nickname" VARCHAR,
    "type" VARCHAR NOT NULL DEFAULT 'recurring',
    "billing_scheme" VARCHAR NOT NULL DEFAULT 'per_unit',
    "tiers_mode" VARCHAR,
    "tiers" JSON,
    "recurring" JSON,
    "tax_behavior" VARCHAR,
    "transform_quantity" JSON,
    "trial_period_days" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSON,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "archived_at" BIGINT,

    CONSTRAINT "prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" VARCHAR NOT NULL,
    "slug" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "description" TEXT,
    "app_id" VARCHAR,
    "status" VARCHAR NOT NULL DEFAULT 'active',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "statement_descriptor" VARCHAR,
    "unit_label" VARCHAR,
    "tax_code_id" VARCHAR,
    "lookup_key" VARCHAR,
    "metadata" JSON,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "archived_at" BIGINT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provisioning_manifest_revisions" (
    "id" VARCHAR NOT NULL,
    "manifest_id" VARCHAR NOT NULL,
    "revision" INTEGER NOT NULL,
    "status" VARCHAR NOT NULL,
    "reconciliation" VARCHAR NOT NULL DEFAULT 'create_missing',
    "preserve_tenant_overrides" BOOLEAN NOT NULL DEFAULT true,
    "finance_dependency" VARCHAR NOT NULL DEFAULT 'none',
    "finance_scopes" VARCHAR[] DEFAULT ARRAY[]::VARCHAR[],
    "published_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "provisioning_manifest_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provisioning_manifests" (
    "id" VARCHAR NOT NULL,
    "target_type" VARCHAR NOT NULL,
    "target_key" VARCHAR NOT NULL,
    "manifest_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "provisioning_manifests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provisioning_notes" (
    "id" VARCHAR NOT NULL,
    "manifest_id" VARCHAR NOT NULL,
    "body" TEXT NOT NULL,
    "author_user_id" VARCHAR,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "provisioning_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provisioning_properties" (
    "id" VARCHAR NOT NULL,
    "resource_id" VARCHAR NOT NULL,
    "key" VARCHAR NOT NULL,
    "value_type" VARCHAR NOT NULL,
    "string_value" TEXT,
    "integer_value" BIGINT,
    "decimal_value" DECIMAL(24,8),
    "boolean_value" BOOLEAN,
    "reference_namespace" VARCHAR,
    "reference_key" VARCHAR,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "provisioning_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provisioning_resources" (
    "id" VARCHAR NOT NULL,
    "revision_id" VARCHAR NOT NULL,
    "resource_type" VARCHAR NOT NULL,
    "key" VARCHAR NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "provisioning_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provisioning_run_steps" (
    "id" VARCHAR NOT NULL,
    "run_id" VARCHAR NOT NULL,
    "target_type" VARCHAR NOT NULL,
    "target_key" VARCHAR NOT NULL,
    "revision_id" VARCHAR NOT NULL,
    "revision" INTEGER NOT NULL,
    "step_key" VARCHAR NOT NULL,
    "description" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" VARCHAR NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" BIGINT,
    "completed_at" BIGINT,
    "last_error" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "provisioning_run_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provisioning_runs" (
    "id" VARCHAR NOT NULL,
    "organization_id" VARCHAR NOT NULL,
    "app_id" VARCHAR NOT NULL,
    "subscription_id" VARCHAR,
    "outbox_event_id" VARCHAR,
    "trigger" VARCHAR NOT NULL,
    "status" VARCHAR NOT NULL,
    "manifest_version" INTEGER NOT NULL DEFAULT 1,
    "finance_revision_id" VARCHAR,
    "finance_revision" INTEGER,
    "application_revision_id" VARCHAR,
    "application_revision" INTEGER,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "available_at" BIGINT NOT NULL,
    "started_at" BIGINT,
    "completed_at" BIGINT,
    "last_error" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "provisioning_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provisioning_steps" (
    "id" VARCHAR NOT NULL,
    "revision_id" VARCHAR NOT NULL,
    "key" VARCHAR NOT NULL,
    "description" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "provisioning_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regions" (
    "id" VARCHAR NOT NULL,
    "country_code" VARCHAR(2) NOT NULL,
    "code" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "type" VARCHAR NOT NULL DEFAULT 'parish',
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reserved_usernames" (
    "username" VARCHAR NOT NULL,
    "reason" VARCHAR,
    "created_at" BIGINT NOT NULL,

    CONSTRAINT "reserved_usernames_pkey" PRIMARY KEY ("username")
);

-- CreateTable
CREATE TABLE "secondary_schools" (
    "id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "principal" VARCHAR,
    "school_type" VARCHAR,
    "logo_url" VARCHAR,
    "address_id" VARCHAR NOT NULL,
    "contact_number" VARCHAR,
    "email" VARCHAR,
    "deleted_at" BIGINT,
    "deleted_by" VARCHAR,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "secondary_schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" VARCHAR NOT NULL,
    "user_id" VARCHAR NOT NULL,
    "app_id" VARCHAR,
    "token" VARCHAR,
    "token_hash" VARCHAR NOT NULL,
    "expires_at" BIGINT NOT NULL,
    "ip_address" VARCHAR,
    "user_agent" VARCHAR,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "device_id" VARCHAR,
    "ip_country_code" VARCHAR(2),
    "ip_region" VARCHAR,
    "ip_city" VARCHAR,
    "ip_asn" VARCHAR,
    "ip_as_organization" VARCHAR,
    "last_seen_at" BIGINT,
    "revoked_at" BIGINT,
    "revoked_by" VARCHAR,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_platforms" (
    "id" VARCHAR NOT NULL,
    "slug" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "icon_slug" VARCHAR NOT NULL,
    "profile_url_template" VARCHAR,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "social_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sso_connections" (
    "id" VARCHAR NOT NULL,
    "provider_id" VARCHAR NOT NULL,
    "organization_id" VARCHAR,
    "external_connection_id" VARCHAR NOT NULL,
    "external_organization_id" VARCHAR,
    "name" VARCHAR,
    "domain" VARCHAR,
    "status" VARCHAR NOT NULL DEFAULT 'active',
    "raw_provider_data" JSON,
    "last_synced_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "sso_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sso_identities" (
    "id" VARCHAR NOT NULL,
    "user_id" VARCHAR NOT NULL,
    "provider_id" VARCHAR NOT NULL,
    "connection_id" VARCHAR,
    "external_identity_id" VARCHAR NOT NULL,
    "external_user_id" VARCHAR,
    "email" VARCHAR,
    "username" VARCHAR,
    "display_name" VARCHAR,
    "raw_provider_data" JSON,
    "last_synced_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "sso_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_items" (
    "id" VARCHAR NOT NULL,
    "subscription_id" VARCHAR NOT NULL,
    "price_id" VARCHAR NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "billing_thresholds" JSON,
    "metadata" JSON,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "subscription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" VARCHAR NOT NULL,
    "billing_account_id" VARCHAR,
    "organization_id" VARCHAR NOT NULL,
    "app_id" VARCHAR NOT NULL,
    "status" VARCHAR NOT NULL DEFAULT 'active',
    "provider_status" VARCHAR,
    "status_reason" VARCHAR,
    "collection_method" VARCHAR NOT NULL DEFAULT 'charge_automatically',
    "billing_cycle_anchor" BIGINT,
    "current_period_start" BIGINT,
    "current_period_end" BIGINT,
    "cancel_at" BIGINT,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" BIGINT,
    "ended_at" BIGINT,
    "pause_collection" JSON,
    "trial_start" BIGINT,
    "trial_end" BIGINT,
    "start_date" BIGINT,
    "default_payment_method_id" VARCHAR,
    "latest_invoice_id" VARCHAR,
    "pending_update" JSON,
    "schedule_id" VARCHAR,
    "metadata" JSON,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "stripe_subscription_id" VARCHAR,
    "finance_lifecycle_version" INTEGER NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_codes" (
    "id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "description" TEXT,
    "requirements" JSON,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "tax_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rates" (
    "id" VARCHAR NOT NULL,
    "display_name" VARCHAR NOT NULL,
    "description" TEXT,
    "percentage" DOUBLE PRECISION NOT NULL,
    "inclusive" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "country" VARCHAR(2),
    "state" VARCHAR,
    "jurisdiction" VARCHAR,
    "jurisdiction_level" VARCHAR,
    "tax_type" VARCHAR,
    "rate_type" VARCHAR,
    "flat_amount" JSON,
    "metadata" JSON,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "university_campuses" (
    "id" VARCHAR NOT NULL,
    "university_id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "is_main_campus" BOOLEAN NOT NULL DEFAULT false,
    "address_id" VARCHAR NOT NULL,
    "contact_number" VARCHAR,
    "email" VARCHAR,
    "deleted_at" BIGINT,
    "deleted_by" VARCHAR,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "university_campuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "universities" (
    "id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "acronym" VARCHAR,
    "logo_url" VARCHAR,
    "website" VARCHAR,
    "deleted_at" BIGINT,
    "deleted_by" VARCHAR,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "universities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_app_enrollments" (
    "id" VARCHAR NOT NULL,
    "user_id" VARCHAR NOT NULL,
    "app_id" VARCHAR NOT NULL,
    "enrolled_at" BIGINT NOT NULL,
    "last_seen_at" BIGINT NOT NULL,

    CONSTRAINT "user_app_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_devices" (
    "id" VARCHAR NOT NULL,
    "user_id" VARCHAR NOT NULL,
    "fingerprint" VARCHAR NOT NULL,
    "confidence" VARCHAR NOT NULL DEFAULT 'low',
    "device_type" VARCHAR NOT NULL DEFAULT 'other',
    "device_brand" VARCHAR,
    "device_model" VARCHAR,
    "os_name" VARCHAR,
    "os_version" VARCHAR,
    "browser_name" VARCHAR,
    "browser_version" VARCHAR,
    "is_bot" BOOLEAN NOT NULL DEFAULT false,
    "label" VARCHAR,
    "trusted" BOOLEAN NOT NULL DEFAULT false,
    "trusted_at" BIGINT,
    "trusted_by" VARCHAR,
    "blocked_at" BIGINT,
    "blocked_by" VARCHAR,
    "block_reason" TEXT,
    "first_seen_at" BIGINT NOT NULL,
    "last_seen_at" BIGINT NOT NULL,
    "last_ip" VARCHAR,
    "last_country_code" VARCHAR(2),
    "sign_in_count" INTEGER NOT NULL DEFAULT 0,
    "signal" JSON,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_emails" (
    "id" VARCHAR NOT NULL,
    "user_id" VARCHAR NOT NULL,
    "email" VARCHAR NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "verification_status" VARCHAR NOT NULL DEFAULT 'unverified',
    "verification_id" VARCHAR,
    "verified_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "user_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_features" (
    "id" VARCHAR NOT NULL,
    "user_id" VARCHAR NOT NULL,
    "feature_id" VARCHAR NOT NULL,
    "status" VARCHAR NOT NULL DEFAULT 'enabled',
    "note" VARCHAR,
    "synced_at" BIGINT NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "user_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_identifications" (
    "id" VARCHAR NOT NULL,
    "user_id" VARCHAR NOT NULL,
    "type" VARCHAR NOT NULL,
    "value" VARCHAR NOT NULL,
    "country_code" VARCHAR(2),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" BIGINT,
    "verified_by" VARCHAR,
    "deleted_at" BIGINT,
    "deleted_by" VARCHAR,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "value_ciphertext" TEXT,
    "value_key_id" VARCHAR,
    "value_provider" VARCHAR,
    "value_last4" VARCHAR(4),
    "value_hash" VARCHAR,

    CONSTRAINT "user_identifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_mobile_numbers" (
    "id" VARCHAR NOT NULL,
    "user_id" VARCHAR NOT NULL,
    "number" VARCHAR NOT NULL,
    "type" VARCHAR NOT NULL DEFAULT 'mobile',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "verification_status" VARCHAR NOT NULL DEFAULT 'unverified',
    "verification_id" VARCHAR,
    "verified_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "carrier_name" VARCHAR,
    "line_type" VARCHAR,

    CONSTRAINT "user_mobile_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_pins" (
    "id" VARCHAR NOT NULL,
    "user_id" VARCHAR NOT NULL,
    "scope" VARCHAR NOT NULL DEFAULT 'account',
    "pin_hash" TEXT NOT NULL,
    "algorithm" VARCHAR NOT NULL DEFAULT 'scrypt',
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" BIGINT,
    "last_verified_at" BIGINT,
    "set_at" BIGINT NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "user_pins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" VARCHAR NOT NULL,
    "user_id" VARCHAR NOT NULL,
    "bio" TEXT,
    "display_name" VARCHAR,
    "nickname" VARCHAR,
    "gender" VARCHAR,
    "date_of_birth" VARCHAR,
    "language" VARCHAR,
    "timezone" VARCHAR,
    "country_code" VARCHAR(2),
    "phone_number" VARCHAR,
    "website" VARCHAR,
    "location" VARCHAR,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_social_profiles" (
    "id" VARCHAR NOT NULL,
    "user_id" VARCHAR NOT NULL,
    "platform_id" VARCHAR NOT NULL,
    "handle" VARCHAR NOT NULL,
    "profile_url" VARCHAR,
    "display_name" VARCHAR,
    "visibility" VARCHAR NOT NULL DEFAULT 'private',
    "verified_at" BIGINT,
    "metadata" JSON,
    "deleted_at" BIGINT,
    "deleted_by" VARCHAR,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "user_social_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR NOT NULL,
    "workos_user_id" VARCHAR NOT NULL,
    "stripe_customer_id" VARCHAR,
    "email" VARCHAR NOT NULL,
    "username" VARCHAR,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "first_name" VARCHAR NOT NULL,
    "last_name" VARCHAR NOT NULL,
    "middle_name" VARCHAR,
    "avatar" VARCHAR,
    "role" VARCHAR NOT NULL DEFAULT 'user',
    "platform_role" VARCHAR,
    "status" VARCHAR NOT NULL DEFAULT 'active',
    "name" VARCHAR,
    "phone" VARCHAR,
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSON,
    "private_metadata" JSON,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "banned_reason" VARCHAR,
    "deleted_at" BIGINT,
    "deleted_by" VARCHAR,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "flagsmith_identity_id" BIGINT,
    "flagsmith_identifier" VARCHAR,
    "flagsmith_environment_id" VARCHAR,
    "flagsmith_identity_synced_at" BIGINT,
    "avatar_file_id" VARCHAR,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" VARCHAR NOT NULL,
    "identifier" VARCHAR NOT NULL,
    "value" VARCHAR NOT NULL,
    "type" VARCHAR NOT NULL,
    "expires_at" BIGINT NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "provider" VARCHAR,
    "provider_sid" VARCHAR,
    "subject_type" VARCHAR,
    "subject_id" VARCHAR,
    "channel" VARCHAR,
    "status" VARCHAR,
    "attempt_count" INTEGER,
    "last_sent_at" BIGINT,
    "can_resend_at" BIGINT,
    "verified_at" BIGINT,
    "metadata" JSON,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ix_accounts_user_id" ON "accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_id_account_id_key" ON "accounts"("provider_id", "account_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "ix_app_assignments_app_id" ON "app_assignments"("app_id");

-- CreateIndex
CREATE INDEX "ix_app_assignments_organization_id" ON "app_assignments"("organization_id");

-- CreateIndex
CREATE INDEX "ix_app_assignments_user_id" ON "app_assignments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_assignments_organization_id_user_id_app_id_key" ON "app_assignments"("organization_id", "user_id", "app_id");

-- CreateIndex
CREATE UNIQUE INDEX "apps_slug_key" ON "apps"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "apps_client_id_key" ON "apps"("client_id");

-- CreateIndex
CREATE INDEX "ix_application_modules_app_id" ON "application_modules"("app_id");

-- CreateIndex
CREATE INDEX "ix_application_modules_feature_id" ON "application_modules"("feature_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_modules_app_id_key_key" ON "application_modules"("app_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "uq_application_modules_app_feature" ON "application_modules"("app_id", "feature_id") WHERE (feature_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "ix_audit_events_app_name_created_at" ON "audit_events"("app_name", "created_at");

-- CreateIndex
CREATE INDEX "ix_audit_events_created_at" ON "audit_events"("created_at");

-- CreateIndex
CREATE INDEX "ix_audit_events_event_created_at" ON "audit_events"("event", "created_at");

-- CreateIndex
CREATE INDEX "ix_audit_events_user_id_created_at" ON "audit_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "ix_auth_attempts_created_at" ON "auth_attempts"("created_at");

-- CreateIndex
CREATE INDEX "ix_auth_attempts_device_fingerprint" ON "auth_attempts"("device_fingerprint");

-- CreateIndex
CREATE INDEX "ix_auth_attempts_identifier" ON "auth_attempts"("identifier");

-- CreateIndex
CREATE INDEX "ix_auth_attempts_identifier_created" ON "auth_attempts"("identifier", "created_at");

-- CreateIndex
CREATE INDEX "ix_auth_attempts_ip_address" ON "auth_attempts"("ip_address");

-- CreateIndex
CREATE INDEX "ix_auth_attempts_ip_country_code" ON "auth_attempts"("ip_country_code");

-- CreateIndex
CREATE INDEX "ix_auth_attempts_ip_created" ON "auth_attempts"("ip_address", "created_at");

-- CreateIndex
CREATE INDEX "ix_auth_attempts_outcome_created" ON "auth_attempts"("outcome", "created_at");

-- CreateIndex
CREATE INDEX "ix_auth_attempts_user_created" ON "auth_attempts"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "ix_auth_attempts_user_id" ON "auth_attempts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_providers_workos_provider_id_key" ON "auth_providers"("workos_provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "authorization_codes_code_hash_key" ON "authorization_codes"("code_hash");

-- CreateIndex
CREATE INDEX "ix_bank_accounts_bank_id" ON "bank_accounts"("bank_id");

-- CreateIndex
CREATE INDEX "ix_bank_accounts_branch_id" ON "bank_accounts"("branch_id");

-- CreateIndex
CREATE INDEX "ix_bank_branches_address_id" ON "bank_branches"("address_id");

-- CreateIndex
CREATE INDEX "ix_bank_branches_bank_id" ON "bank_branches"("bank_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_branches_bank_id_transit_number_key" ON "bank_branches"("bank_id", "transit_number");

-- CreateIndex
CREATE UNIQUE INDEX "banks_bank_code_key" ON "banks"("bank_code");

-- CreateIndex
CREATE INDEX "ix_billing_accounts_organization_id" ON "billing_accounts"("organization_id");

-- CreateIndex
CREATE INDEX "ix_billing_customer_outbox_delivery" ON "billing_customer_outbox"("status", "available_at", "created_at");

-- CreateIndex
CREATE INDEX "ix_billing_customer_outbox_subject" ON "billing_customer_outbox"("subject_type", "subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_provider_object" ON "billing_provider_objects"("provider", "provider_object_type", "provider_object_id");

-- CreateIndex
CREATE INDEX "ix_communication_messages_provider_sid" ON "communication_messages"("provider_sid");

-- CreateIndex
CREATE UNIQUE INDEX "uq_communication_messages_app_idempotency" ON "communication_messages"("app_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "uq_communication_webhook_event" ON "communication_webhook_events"("provider_sid", "event_type", "payload_hash");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_owner_user_id_contact_user_id_key" ON "contacts"("owner_user_id", "contact_user_id");

-- CreateIndex
CREATE INDEX "ix_credit_union_branches_address_id" ON "credit_union_branches"("address_id");

-- CreateIndex
CREATE INDEX "ix_credit_union_branches_credit_union_id" ON "credit_union_branches"("credit_union_id");

-- CreateIndex
CREATE INDEX "ix_directory_addresses_state_city" ON "directory_addresses"("state", "city");

-- CreateIndex
CREATE UNIQUE INDEX "employee_profiles_membership_id_key" ON "employee_profiles"("membership_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_profiles_organization_id_employee_number_key" ON "employee_profiles"("organization_id", "employee_number");

-- CreateIndex
CREATE UNIQUE INDEX "ix_feature_flag_migration_archives_checksum" ON "feature_flag_migration_archives"("checksum");

-- CreateIndex
CREATE UNIQUE INDEX "features_slug_key" ON "features"("slug");

-- CreateIndex
CREATE INDEX "ix_features_app_id" ON "features"("app_id");

-- CreateIndex
CREATE INDEX "ix_features_parent_feature_id" ON "features"("parent_feature_id");

-- CreateIndex
CREATE INDEX "ix_features_provider_feature_id" ON "features"("provider_feature_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_finance_provisioning_outbox_run_id" ON "finance_provisioning_outbox"("run_id") WHERE (run_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "ix_finance_provisioning_outbox_aggregate" ON "finance_provisioning_outbox"("aggregate_id", "lifecycle_version");

-- CreateIndex
CREATE INDEX "ix_finance_provisioning_outbox_delivery" ON "finance_provisioning_outbox"("status", "available_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "finance_provisioning_outbox_aggregate_id_lifecycle_version_key" ON "finance_provisioning_outbox"("aggregate_id", "lifecycle_version");

-- CreateIndex
CREATE UNIQUE INDEX "invite_tokens_token_key" ON "invite_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_workos_membership_id_key" ON "memberships"("workos_membership_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_organization_id_user_id_key" ON "memberships"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "ix_ministry_departments_address_id" ON "ministry_departments"("address_id");

-- CreateIndex
CREATE INDEX "ix_ministry_departments_ministry_id" ON "ministry_departments"("ministry_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_grants_user_id_app_id_key" ON "oauth_grants"("user_id", "app_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_refresh_tokens_token_hash_key" ON "oauth_refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "ix_onboarding_answers_session_id" ON "onboarding_answers"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_answers_session_id_field_key_key" ON "onboarding_answers"("session_id", "field_key");

-- CreateIndex
CREATE INDEX "ix_onboarding_sessions_organization_id" ON "onboarding_sessions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_sessions_organization_id_target_type_target_key__key" ON "onboarding_sessions"("organization_id", "target_type", "target_key", "country_code", "schema_version", "catalog_revision");

-- CreateIndex
CREATE UNIQUE INDEX "org_departments_organization_id_code_key" ON "org_departments"("organization_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "org_features_organization_id_feature_id_key" ON "org_features"("organization_id", "feature_id");

-- CreateIndex
CREATE UNIQUE INDEX "org_locations_organization_id_code_key" ON "org_locations"("organization_id", "code");

-- CreateIndex
CREATE INDEX "ix_organization_roles_organization_id" ON "organization_roles"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_roles_organization_id_name_key" ON "organization_roles"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_workos_organization_id_key" ON "organizations"("workos_organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_stripe_customer_id_key" ON "organizations"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "ix_plan_modules_module_id" ON "plan_modules"("module_id");

-- CreateIndex
CREATE INDEX "ix_plan_modules_product_id" ON "plan_modules"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_modules_product_id_module_id_key" ON "plan_modules"("product_id", "module_id");

-- CreateIndex
CREATE UNIQUE INDEX "prices_lookup_key_key" ON "prices"("lookup_key");

-- CreateIndex
CREATE INDEX "ix_prices_product_id" ON "prices"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_lookup_key_key" ON "products"("lookup_key");

-- CreateIndex
CREATE INDEX "ix_products_app_id" ON "products"("app_id");

-- CreateIndex
CREATE INDEX "ix_products_tax_code_id" ON "products"("tax_code_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_provisioning_manifest_revisions_draft" ON "provisioning_manifest_revisions"("manifest_id") WHERE ((status)::text = 'draft'::text);

-- CreateIndex
CREATE INDEX "ix_provisioning_manifest_revisions_manifest_id" ON "provisioning_manifest_revisions"("manifest_id");

-- CreateIndex
CREATE UNIQUE INDEX "provisioning_manifest_revisions_manifest_id_revision_key" ON "provisioning_manifest_revisions"("manifest_id", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "uq_provisioning_manifest_revisions_published" ON "provisioning_manifest_revisions"("manifest_id") WHERE ((status)::text = 'published'::text);

-- CreateIndex
CREATE INDEX "ix_provisioning_manifests_target_type" ON "provisioning_manifests"("target_type");

-- CreateIndex
CREATE UNIQUE INDEX "provisioning_manifests_target_type_target_key_key" ON "provisioning_manifests"("target_type", "target_key");

-- CreateIndex
CREATE INDEX "ix_provisioning_notes_manifest_id" ON "provisioning_notes"("manifest_id");

-- CreateIndex
CREATE INDEX "ix_provisioning_properties_resource_id" ON "provisioning_properties"("resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "provisioning_properties_resource_id_key_key" ON "provisioning_properties"("resource_id", "key");

-- CreateIndex
CREATE INDEX "ix_provisioning_resources_revision_id" ON "provisioning_resources"("revision_id");

-- CreateIndex
CREATE UNIQUE INDEX "provisioning_resources_revision_id_position_key" ON "provisioning_resources"("revision_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "provisioning_resources_revision_id_resource_type_key_key" ON "provisioning_resources"("revision_id", "resource_type", "key");

-- CreateIndex
CREATE INDEX "ix_provisioning_run_steps_run_id" ON "provisioning_run_steps"("run_id");

-- CreateIndex
CREATE UNIQUE INDEX "provisioning_run_steps_run_id_position_key" ON "provisioning_run_steps"("run_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "provisioning_run_steps_run_id_target_type_target_key_step_k_key" ON "provisioning_run_steps"("run_id", "target_type", "target_key", "step_key");

-- CreateIndex
CREATE UNIQUE INDEX "provisioning_runs_outbox_event_id_key" ON "provisioning_runs"("outbox_event_id");

-- CreateIndex
CREATE INDEX "ix_provisioning_runs_app_id" ON "provisioning_runs"("app_id");

-- CreateIndex
CREATE INDEX "ix_provisioning_runs_delivery" ON "provisioning_runs"("status", "available_at", "created_at");

-- CreateIndex
CREATE INDEX "ix_provisioning_runs_org_created" ON "provisioning_runs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "ix_provisioning_runs_organization_id" ON "provisioning_runs"("organization_id");

-- CreateIndex
CREATE INDEX "ix_provisioning_steps_revision_id" ON "provisioning_steps"("revision_id");

-- CreateIndex
CREATE UNIQUE INDEX "provisioning_steps_revision_id_key_key" ON "provisioning_steps"("revision_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "provisioning_steps_revision_id_position_key" ON "provisioning_steps"("revision_id", "position");

-- CreateIndex
CREATE INDEX "ix_secondary_schools_address_id" ON "secondary_schools"("address_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "ix_sessions_user_id" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "social_platforms_slug_key" ON "social_platforms"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "sso_connections_provider_id_external_connection_id_key" ON "sso_connections"("provider_id", "external_connection_id");

-- CreateIndex
CREATE UNIQUE INDEX "sso_identities_provider_id_external_identity_id_key" ON "sso_identities"("provider_id", "external_identity_id");

-- CreateIndex
CREATE INDEX "ix_subscription_items_price_id" ON "subscription_items"("price_id");

-- CreateIndex
CREATE INDEX "ix_subscription_items_subscription_id" ON "subscription_items"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "ix_subscriptions_app_id" ON "subscriptions"("app_id");

-- CreateIndex
CREATE INDEX "ix_subscriptions_billing_account_id" ON "subscriptions"("billing_account_id");

-- CreateIndex
CREATE INDEX "ix_subscriptions_finance_lifecycle_version" ON "subscriptions"("finance_lifecycle_version");

-- CreateIndex
CREATE INDEX "ix_subscriptions_org_app" ON "subscriptions"("organization_id", "app_id");

-- CreateIndex
CREATE INDEX "ix_subscriptions_organization_id" ON "subscriptions"("organization_id");

-- CreateIndex
CREATE INDEX "ix_university_campuses_address_id" ON "university_campuses"("address_id");

-- CreateIndex
CREATE INDEX "ix_university_campuses_university_id" ON "university_campuses"("university_id");

-- CreateIndex
CREATE INDEX "ix_user_app_enrollments_app_id" ON "user_app_enrollments"("app_id");

-- CreateIndex
CREATE INDEX "ix_user_app_enrollments_user_id" ON "user_app_enrollments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_app_enrollments_user_id_app_id_key" ON "user_app_enrollments"("user_id", "app_id");

-- CreateIndex
CREATE INDEX "ix_user_devices_fingerprint" ON "user_devices"("fingerprint");

-- CreateIndex
CREATE INDEX "ix_user_devices_user_id" ON "user_devices"("user_id");

-- CreateIndex
CREATE INDEX "ix_user_devices_user_last_seen" ON "user_devices"("user_id", "last_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_user_id_fingerprint_key" ON "user_devices"("user_id", "fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "user_emails_email_key" ON "user_emails"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_features_user_id_feature_id_key" ON "user_features"("user_id", "feature_id");

-- CreateIndex
CREATE INDEX "ix_user_identifications_user_id" ON "user_identifications"("user_id");

-- CreateIndex
CREATE INDEX "ix_user_identifications_value_hash" ON "user_identifications"("value_hash");

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_identifications_user_type_active" ON "user_identifications"("user_id", "type") WHERE (deleted_at IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_mobile_numbers_primary_per_user" ON "user_mobile_numbers"("user_id") WHERE (is_primary);

-- CreateIndex
CREATE UNIQUE INDEX "user_mobile_numbers_user_id_number_key" ON "user_mobile_numbers"("user_id", "number");

-- CreateIndex
CREATE INDEX "ix_user_pins_user_id" ON "user_pins"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_pins_user_scope" ON "user_pins"("user_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_social_profiles_user_id_platform_id_handle_key" ON "user_social_profiles"("user_id", "platform_id", "handle");

-- CreateIndex
CREATE UNIQUE INDEX "users_workos_user_id_key" ON "users"("workos_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_flagsmith_identifier" ON "users"("flagsmith_identifier") WHERE (flagsmith_identifier IS NOT NULL);

-- CreateIndex
CREATE INDEX "ix_users_flagsmith_identity_id" ON "users"("flagsmith_identity_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "auth_providers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_assignments" ADD CONSTRAINT "app_assignments_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_assignments" ADD CONSTRAINT "app_assignments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_assignments" ADD CONSTRAINT "app_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "apps" ADD CONSTRAINT "apps_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "application_modules" ADD CONSTRAINT "application_modules_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "application_modules" ADD CONSTRAINT "application_modules_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth_attempts" ADD CONSTRAINT "auth_attempts_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth_attempts" ADD CONSTRAINT "auth_attempts_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "user_devices"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth_attempts" ADD CONSTRAINT "auth_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "authorization_codes" ADD CONSTRAINT "authorization_codes_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "authorization_codes" ADD CONSTRAINT "authorization_codes_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "authorization_codes" ADD CONSTRAINT "authorization_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "banks"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "bank_branches"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bank_branches" ADD CONSTRAINT "bank_branches_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "directory_addresses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bank_branches" ADD CONSTRAINT "bank_branches_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "banks"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_contact_user_id_fkey" FOREIGN KEY ("contact_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "credit_union_branches" ADD CONSTRAINT "credit_union_branches_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "directory_addresses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "credit_union_branches" ADD CONSTRAINT "credit_union_branches_credit_union_id_fkey" FOREIGN KEY ("credit_union_id") REFERENCES "credit_unions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "org_departments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "org_locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_manager_membership_id_fkey" FOREIGN KEY ("manager_membership_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "features" ADD CONSTRAINT "features_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "features" ADD CONSTRAINT "features_parent_feature_id_fkey" FOREIGN KEY ("parent_feature_id") REFERENCES "features"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invite_tokens" ADD CONSTRAINT "invite_tokens_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invite_tokens" ADD CONSTRAINT "invite_tokens_source_app_id_fkey" FOREIGN KEY ("source_app_id") REFERENCES "apps"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "organization_roles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ministry_departments" ADD CONSTRAINT "ministry_departments_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "directory_addresses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ministry_departments" ADD CONSTRAINT "ministry_departments_ministry_id_fkey" FOREIGN KEY ("ministry_id") REFERENCES "ministries"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "oauth_grants" ADD CONSTRAINT "oauth_grants_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "oauth_grants" ADD CONSTRAINT "oauth_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "onboarding_answers" ADD CONSTRAINT "onboarding_answers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "onboarding_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "org_contacts" ADD CONSTRAINT "org_contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "org_contacts" ADD CONSTRAINT "org_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "org_departments" ADD CONSTRAINT "org_departments_head_membership_id_fkey" FOREIGN KEY ("head_membership_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "org_departments" ADD CONSTRAINT "org_departments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "org_departments" ADD CONSTRAINT "org_departments_parent_department_id_fkey" FOREIGN KEY ("parent_department_id") REFERENCES "org_departments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "org_features" ADD CONSTRAINT "org_features_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "org_features" ADD CONSTRAINT "org_features_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "org_locations" ADD CONSTRAINT "org_locations_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "org_locations" ADD CONSTRAINT "org_locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "org_locations" ADD CONSTRAINT "org_locations_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "organization_roles" ADD CONSTRAINT "organization_roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_primary_contact_user_id_fkey" FOREIGN KEY ("primary_contact_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "plan_modules" ADD CONSTRAINT "plan_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "application_modules"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "plan_modules" ADD CONSTRAINT "plan_modules_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prices" ADD CONSTRAINT "prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "fk_products_tax_code_id_tax_codes" FOREIGN KEY ("tax_code_id") REFERENCES "tax_codes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "provisioning_manifest_revisions" ADD CONSTRAINT "provisioning_manifest_revisions_manifest_id_fkey" FOREIGN KEY ("manifest_id") REFERENCES "provisioning_manifests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "provisioning_notes" ADD CONSTRAINT "provisioning_notes_manifest_id_fkey" FOREIGN KEY ("manifest_id") REFERENCES "provisioning_manifests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "provisioning_properties" ADD CONSTRAINT "provisioning_properties_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "provisioning_resources"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "provisioning_resources" ADD CONSTRAINT "provisioning_resources_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "provisioning_manifest_revisions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "provisioning_run_steps" ADD CONSTRAINT "provisioning_run_steps_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "provisioning_runs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "provisioning_steps" ADD CONSTRAINT "provisioning_steps_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "provisioning_manifest_revisions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "regions" ADD CONSTRAINT "regions_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "secondary_schools" ADD CONSTRAINT "secondary_schools_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "directory_addresses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sso_connections" ADD CONSTRAINT "sso_connections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sso_connections" ADD CONSTRAINT "sso_connections_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "auth_providers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sso_identities" ADD CONSTRAINT "sso_identities_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "sso_connections"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sso_identities" ADD CONSTRAINT "sso_identities_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "auth_providers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sso_identities" ADD CONSTRAINT "sso_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_price_id_fkey" FOREIGN KEY ("price_id") REFERENCES "prices"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_billing_account_id_fkey" FOREIGN KEY ("billing_account_id") REFERENCES "billing_accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "university_campuses" ADD CONSTRAINT "university_campuses_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "directory_addresses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "university_campuses" ADD CONSTRAINT "university_campuses_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_app_enrollments" ADD CONSTRAINT "user_app_enrollments_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_app_enrollments" ADD CONSTRAINT "user_app_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_emails" ADD CONSTRAINT "user_emails_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_emails" ADD CONSTRAINT "user_emails_verification_id_fkey" FOREIGN KEY ("verification_id") REFERENCES "verifications"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_features" ADD CONSTRAINT "user_features_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_features" ADD CONSTRAINT "user_features_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_identifications" ADD CONSTRAINT "user_identifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_mobile_numbers" ADD CONSTRAINT "user_mobile_numbers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_mobile_numbers" ADD CONSTRAINT "user_mobile_numbers_verification_id_fkey" FOREIGN KEY ("verification_id") REFERENCES "verifications"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_pins" ADD CONSTRAINT "user_pins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_social_profiles" ADD CONSTRAINT "user_social_profiles_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "social_platforms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_social_profiles" ADD CONSTRAINT "user_social_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

