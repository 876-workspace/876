import { z } from 'zod'

const optionalString = (fallback = '') =>
  z
    .string()
    .optional()
    .transform((value) => value ?? fallback)

const optionalNumber = (fallback: number) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (!value?.trim()) return fallback
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : fallback
    })

const booleanish = () =>
  z
    .string()
    .optional()
    .transform((value) =>
      ['1', 'true', 'yes', 'on'].includes((value ?? '').trim().toLowerCase())
    )

const envSchema = z.object({
  PORT: optionalNumber(4004),
  ENVIRONMENT: optionalString('production'),
  DELETION_MODE: z.enum(['hard', 'soft']).optional(),
  LOG_LEVEL: optionalString('info'),
  BILLING_DATABASE_URL: optionalString(),
  BILLING_DIRECT_DATABASE_URL: optionalString(),
  BILLING_LEGACY_DATABASE_URL: optionalString(),
  // Express owns the writer lease (the FastAPI cutover is complete), so the
  // default is `express`. `none` stays available as a deliberate freeze switch
  // but is no longer the default: an unset variable used to leave every new
  // dev environment, CI job, and sibling app silently unable to write.
  BILLING_WRITER: z
    .enum(['legacy', 'fastapi', 'express', 'none'])
    .optional()
    .default('express'),
  API_URL: optionalString('http://127.0.0.1:4000'),
  BILLING_API_876_KEY: optionalString(),
  BILLING_API_KEY: optionalString(),
  API_876_KEY: optionalString(),
  BILLING_INTERNAL_KEY: optionalString(),
  API_INTERNAL_KEY: optionalString(),
  BILLING_SCHEDULER_KEY: optionalString(),
  CRON_SECRET: optionalString(),
  CORS_ALLOWED_ORIGINS: optionalString('http://localhost:3004'),
  SENTRY_DSN: optionalString(),
  IDENTITY_API_TIMEOUT_SECONDS: optionalNumber(5),
  // Efesto is the platform operator workspace. Core customer.ensure events do
  // not carry a tenant id, so an omitted or accidentally blank environment
  // variable must still resolve to the canonical operator tenant rather than
  // failing every customer-sync event at runtime.
  // Payment-credential sealing. WorkOS Vault in deployed environments; a local
  // AES-256-GCM key for development and tests. Neither configured means the
  // provider raises on seal rather than storing a credential in plaintext.
  WORKOS_API_KEY: optionalString(),
  WORKOS_VAULT_ENABLED: booleanish(),
  WORKOS_VAULT_KEY_CONTEXT: optionalString('876-billing'),
  SECURE_FIELD_KEY: optionalString(),
  BILLING_LATE_FEES_ENABLED: booleanish(),
  BILLING_DUNNING_ENABLED: booleanish(),
  BILLING_PAYOUTS_ENABLED: booleanish(),
  BILLING_PLATFORM_TENANT_SLUG: z
    .string()
    .optional()
    .transform((value) => value?.trim() || 'efesto'),
  ACCOUNTING_PROVIDER_SYNC_ENABLED: booleanish(),
  ACCOUNTING_PROVIDER_SYNC_BATCH_SIZE: optionalNumber(10),
  ZOHO_BOOKS_CLIENT_ID: optionalString(),
  ZOHO_BOOKS_CLIENT_SECRET: optionalString(),
  ZOHO_BOOKS_REDIRECT_URI: optionalString(),
  ZOHO_BOOKS_ACCOUNTS_DOMAIN: optionalString('https://accounts.zoho.com'),
})

/**
 * Hosts that used to serve an 876 service and no longer should.
 *
 * The platform left Cloudflare for Vercel, but the old Workers still answer —
 * with pre-migration code. An `API_URL` left pointing at one does not fail: it
 * introspects every user bearer against a stale identity service, which
 * answers `active: false`, so Billing rejects valid tokens as
 * `auth/invalid-token`. That happened in production on 2026-09-06 and cost a
 * day, because the symptom (a client-side React #441) names neither the
 * variable nor the origin. Refuse to boot instead.
 */
const RETIRED_ORIGIN_SUFFIX = '.workers.dev'

function assertLiveIdentityOrigin(url: string): void {
  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    throw new Error(`API_URL is not a valid URL: ${url}`)
  }

  if (host.endsWith(RETIRED_ORIGIN_SUFFIX))
    throw new Error(
      `API_URL points at the retired Cloudflare origin ${host}. That Worker` +
        ' still responds but runs pre-Vercel code, so token introspection' +
        ' fails for every signed-in user. Point API_URL at the current 876' +
        ' identity service.'
    )
}

function build(env: NodeJS.ProcessEnv) {
  const parsed = envSchema.safeParse(env)
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Invalid environment configuration:\n${detail}`)
  }

  const value = parsed.data
  const identityApiUrl = value.API_URL.replace(/\/+$/, '')
  assertLiveIdentityOrigin(identityApiUrl)

  return Object.freeze({
    port: value.PORT,
    environment: value.ENVIRONMENT,
    logLevel: value.LOG_LEVEL,
    databaseUrl: value.BILLING_DATABASE_URL,
    directDatabaseUrl:
      value.BILLING_DIRECT_DATABASE_URL || value.BILLING_DATABASE_URL,
    legacyDatabaseUrl: value.BILLING_LEGACY_DATABASE_URL,
    billingWriter: value.BILLING_WRITER,
    identityApiUrl,
    identityApiKey:
      value.BILLING_API_876_KEY || value.BILLING_API_KEY || value.API_876_KEY,
    internalKey: value.BILLING_INTERNAL_KEY || value.API_INTERNAL_KEY,
    schedulerKey: value.BILLING_SCHEDULER_KEY,
    cronSecret: value.CRON_SECRET,
    corsOrigins: value.CORS_ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    sentryDsn: value.SENTRY_DSN,
    identityTimeoutMs: Math.round(value.IDENTITY_API_TIMEOUT_SECONDS * 1000),
    platformTenantSlug: value.BILLING_PLATFORM_TENANT_SLUG,
    workos: {
      apiKey: value.WORKOS_API_KEY,
      vaultEnabled: value.WORKOS_VAULT_ENABLED,
      vaultKeyContext: value.WORKOS_VAULT_KEY_CONTEXT,
    },
    features: {
      lateFees: value.BILLING_LATE_FEES_ENABLED,
      dunning: value.BILLING_DUNNING_ENABLED,
      payouts: value.BILLING_PAYOUTS_ENABLED,
      accountingProviderSync: value.ACCOUNTING_PROVIDER_SYNC_ENABLED,
    },
    accountingProviderSyncBatchSize: Math.max(
      1,
      Math.min(100, Math.trunc(value.ACCOUNTING_PROVIDER_SYNC_BATCH_SIZE))
    ),
    zohoBooks: {
      clientId: value.ZOHO_BOOKS_CLIENT_ID,
      clientSecret: value.ZOHO_BOOKS_CLIENT_SECRET,
      redirectUri: value.ZOHO_BOOKS_REDIRECT_URI,
      accountsDomain: value.ZOHO_BOOKS_ACCOUNTS_DOMAIN.replace(/\/+$/, ''),
    },
    secureFieldKey: value.SECURE_FIELD_KEY,
    isProduction: value.ENVIRONMENT === 'production',
    deletionMode:
      value.DELETION_MODE ??
      (value.ENVIRONMENT === 'production'
        ? ('soft' as const)
        : ('hard' as const)),
  })
}

export type Settings = ReturnType<typeof build>

let cached: Settings | undefined

export function getSettings(): Settings {
  cached ??= build(process.env)
  return cached
}

export function resetSettingsForTest(env?: NodeJS.ProcessEnv): Settings {
  cached = build(env ?? process.env)
  return cached
}
