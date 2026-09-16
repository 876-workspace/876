import { z } from 'zod'

/**
 * The one place in the service that reads `process.env`.
 *
 * Parsed once at boot and frozen; missing required variables crash with a
 * readable message rather than surfacing as a 500 later.
 */

const int = (fallback: number) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined || value.trim() === '') return fallback
      const parsed = Number.parseInt(value, 10)
      return Number.isNaN(parsed) ? fallback : parsed
    })

const str = (fallback = '') =>
  z
    .string()
    .optional()
    .transform((value) => value ?? fallback)

const ACCELERATE_URL_PROTOCOLS = ['prisma:', 'prisma+postgres:']
const POSTGRES_URL_PROTOCOLS = ['postgres:', 'postgresql:']
const DATABASE_URL_PROTOCOLS = [
  ...ACCELERATE_URL_PROTOCOLS,
  ...POSTGRES_URL_PROTOCOLS,
]

/**
 * A connection string the runtime client can build a transport from.
 *
 * `src/db/client.ts` selects Accelerate for a `prisma:`/`prisma+postgres:` URL
 * and the pg driver adapter for a direct PostgreSQL URL. Any other scheme has
 * no transport, and Prisma would not report that until the first query — as an
 * opaque internal error, with every data route 500ing and nothing naming the
 * cause. Rejecting it here turns that into a boot-time failure with a readable
 * message, which is the whole point of parsing env through this schema.
 *
 * Only the scheme is ever reported: the rest of the URL carries a credential.
 */
const databaseUrl = () =>
  str().refine(
    (value) =>
      value.trim() === '' ||
      DATABASE_URL_PROTOCOLS.includes(
        value.slice(0, value.indexOf(':') + 1).toLowerCase()
      ),
    {
      message: `must be a PostgreSQL URL (${POSTGRES_URL_PROTOCOLS.join(' or ')}) or a Prisma Accelerate URL (${ACCELERATE_URL_PROTOCOLS.join(' or ')}).`,
    }
  )

const envSchema = z.object({
  PORT: int(4001),
  ENVIRONMENT: str('production'),
  LOG_LEVEL: str('info'),
  DATABASE_URL: databaseUrl(),
  DIRECT_DATABASE_URL: z.string().optional(),
  API_876_KEY: z.string().min(1, 'API_876_KEY is required'),
  // Integration callers receive a separate secret and can reach only the
  // explicitly registered `integration` routes. It is never interchangeable
  // with the app API key or the platform-internal admin key.
  COURIERS_INTEGRATION_KEY: str(),
  // An unset internal key is a valid degraded configuration: admin routes
  // reject every request until a service secret is configured.
  API_INTERNAL_KEY: str(),
  // The identity API that minted the bearer. Session tokens are confirmed live
  // through its `/oauth/introspect`, so a signed-out session stops working.
  API_URL: str(),
  OAUTH_ISSUER: str(),
  // The client ID the identity API placed in the access token's `aud` claim.
  // It is deliberately separate from API_876_KEY: an API key is not an OAuth
  // client identifier and must never be used as the expected audience.
  OAUTH_AUDIENCE: str(),
  OAUTH_JWKS_URL: str(),
  SENTRY_DSN: str(),
  BILLING_API_URL: str(),
  COMMUNICATIONS_API_URL: str(),
  COMMUNICATIONS_INTERNAL_KEY: str(),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .optional()
    .transform(
      (value) =>
        value ??
        'http://localhost:3000,http://localhost:3002,http://localhost:3003'
    ),
})

export type Env = z.infer<typeof envSchema>

function jwksUrlFor(e: Env): string {
  if (e.OAUTH_JWKS_URL) return e.OAUTH_JWKS_URL
  const base = (e.API_URL || e.OAUTH_ISSUER).replace(/\/+$/, '')
  return base ? `${base}/oauth/.well-known/jwks.json` : ''
}

function build(env: NodeJS.ProcessEnv) {
  const parsed = envSchema.safeParse(env)
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Invalid environment configuration:\n${detail}`)
  }
  const e = parsed.data
  return Object.freeze({
    port: e.PORT,
    environment: e.ENVIRONMENT,
    logLevel: e.LOG_LEVEL,
    databaseUrl: e.DATABASE_URL,
    directDatabaseUrl: e.DIRECT_DATABASE_URL ?? e.DATABASE_URL,
    api876Key: e.API_876_KEY,
    integrationKey: e.COURIERS_INTEGRATION_KEY,
    internalKey: e.API_INTERNAL_KEY,
    identityApiUrl: e.API_URL.replace(/\/+$/, ''),
    oauth: {
      issuer: e.OAUTH_ISSUER.replace(/\/+$/, ''),
      audience: e.OAUTH_AUDIENCE.trim(),
      jwksUrl: jwksUrlFor(e),
    },
    sentryDsn: e.SENTRY_DSN,
    billingApiUrl: e.BILLING_API_URL,
    communicationsApiUrl: e.COMMUNICATIONS_API_URL,
    communicationsInternalKey: e.COMMUNICATIONS_INTERNAL_KEY,
    corsOrigins: e.CORS_ALLOWED_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
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
