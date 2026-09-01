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
  LOG_LEVEL: optionalString('info'),
  BILLING_DATABASE_URL: optionalString(),
  BILLING_DIRECT_DATABASE_URL: optionalString(),
  BILLING_LEGACY_DATABASE_URL: optionalString(),
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
  CORS_ALLOWED_ORIGINS: optionalString('http://localhost:3004'),
  SENTRY_DSN: optionalString(),
  IDENTITY_API_TIMEOUT_SECONDS: optionalNumber(5),
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

function build(env: NodeJS.ProcessEnv) {
  const parsed = envSchema.safeParse(env)
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Invalid environment configuration:\n${detail}`)
  }

  const value = parsed.data
  return Object.freeze({
    port: value.PORT,
    environment: value.ENVIRONMENT,
    logLevel: value.LOG_LEVEL,
    databaseUrl: value.BILLING_DATABASE_URL,
    directDatabaseUrl:
      value.BILLING_DIRECT_DATABASE_URL || value.BILLING_DATABASE_URL,
    legacyDatabaseUrl: value.BILLING_LEGACY_DATABASE_URL,
    billingWriter: value.BILLING_WRITER,
    identityApiUrl: value.API_URL.replace(/\/+$/, ''),
    identityApiKey:
      value.BILLING_API_876_KEY || value.BILLING_API_KEY || value.API_876_KEY,
    internalKey: value.BILLING_INTERNAL_KEY || value.API_INTERNAL_KEY,
    schedulerKey: value.BILLING_SCHEDULER_KEY,
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
