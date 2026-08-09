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

const accelerateUrl = () =>
  str().refine(
    (value) =>
      value.trim() === '' ||
      ACCELERATE_URL_PROTOCOLS.includes(
        value.slice(0, value.indexOf(':') + 1).toLowerCase()
      ),
    {
      message: `must be a Prisma Accelerate URL (${ACCELERATE_URL_PROTOCOLS.join(' or ')}).`,
    }
  )

const envSchema = z.object({
  PORT: int(4001),
  ENVIRONMENT: str('production'),
  LOG_LEVEL: str('info'),
  DATABASE_URL: accelerateUrl(),
  DIRECT_DATABASE_URL: z.string().optional(),
  API_876_KEY: z.string().min(1, 'API_876_KEY is required'),
  // An unset internal key is a valid degraded configuration: admin routes
  // reject every request until a service secret is configured.
  API_INTERNAL_KEY: str(),
  SESSION_COOKIE_SECRET: z.string().min(1, 'SESSION_COOKIE_SECRET is required'),
  SENTRY_DSN: str(),
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
    internalKey: e.API_INTERNAL_KEY,
    sessionCookieSecret: e.SESSION_COOKIE_SECRET,
    sentryDsn: e.SENTRY_DSN,
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
