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

const envSchema = z.object({
  PORT: optionalNumber(4004),
  ENVIRONMENT: optionalString('production'),
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
  CORS_ALLOWED_ORIGINS: optionalString('http://localhost:3004'),
  SENTRY_DSN: optionalString(),
  IDENTITY_API_TIMEOUT_SECONDS: optionalNumber(5),
  // Efesto is the platform operator workspace. Core customer.ensure events do
  // not carry a tenant id, so an omitted or accidentally blank environment
  // variable must still resolve to the canonical operator tenant rather than
  // failing every customer-sync event at runtime.
  BILLING_PLATFORM_TENANT_SLUG: z
    .string()
    .optional()
    .transform((value) => value?.trim() || 'efesto'),
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
