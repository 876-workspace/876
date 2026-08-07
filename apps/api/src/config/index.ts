import { z } from 'zod'

/**
 * The one place in the service that reads `process.env`.
 *
 * The schema is parsed once at boot and the result frozen, so a missing or
 * malformed variable crashes the process at startup with a readable message
 * rather than surfacing as a 500 on some route three days later. Every variable
 * name matches the FastAPI service exactly — env var names are contracts
 * (.claude/rules/naming.md) and the same values are already set on the
 * Cloudflare Worker.
 */

/** Accepts the several truthy spellings that reach us from Workers vars and .env files. */
const booleanish = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined || value.trim() === '') return fallback
      return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
    })

const optionalBooleanish = z
  .string()
  .optional()
  .transform((value) => {
    if (value === undefined || value.trim() === '') return undefined
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
  })

const int = (fallback: number, min?: number, max?: number) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined || value.trim() === '') return fallback
      const parsed = Number.parseInt(value, 10)
      return Number.isNaN(parsed) ? fallback : parsed
    })
    .refine(
      (value) =>
        (min === undefined || value >= min) &&
        (max === undefined || value <= max),
      {
        message: `must be between ${min ?? '-inf'} and ${max ?? 'inf'}`,
      }
    )

const str = (fallback = '') =>
  z
    .string()
    .optional()
    .transform((value) => value ?? fallback)

const envSchema = z.object({
  PORT: int(4000),
  ENVIRONMENT: str('production'),
  IS_PRODUCTION: booleanish(false),
  LOG_LEVEL: str('info'),
  DELETION_MODE: str('hard'),

  DATABASE_URL: str(),

  WORKOS_API_KEY: str(),
  WORKOS_CLIENT_ID: str(),
  NEXT_PUBLIC_WORKOS_REDIRECT_URI: str(),
  WORKOS_JWKS_URL: str(),
  WORKOS_COOKIE_PASSWORD: str(),
  WORKOS_VAULT_ENABLED: booleanish(false),
  WORKOS_VAULT_KEY_CONTEXT: str('876'),

  API_INTERNAL_KEY: str(),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .optional()
    .transform(
      (value) => value ?? 'http://localhost:3000,http://localhost:3002'
    ),
  ENABLED_SOCIAL_PROVIDERS: z
    .string()
    .optional()
    .transform((value) => value ?? 'google,apple,microsoft'),

  OAUTH_ISSUER: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().optional(),
  OAUTH_PRIVATE_KEY: z.string().optional(),
  OAUTH_KEY_ID: z.string().optional(),
  OAUTH_ACCESS_TOKEN_TTL_SECONDS: int(3600),
  OAUTH_REFRESH_TOKEN_TTL_SECONDS: int(60 * 60 * 24 * 30),

  SESSION_COOKIE_NAME: str('876-session'),
  SESSION_COOKIE_SECRET: str(),
  COOKIE_SECURE: optionalBooleanish,

  SECURE_FIELD_KEY: str(),
  IDENTIFICATION_HASH_PEPPER: str(),

  SENTRY_DSN: str(),
  POSTHOG_PERSONAL_API_KEY: str(),
  POSTHOG_PROJECT_ID: int(0),
  POSTHOG_HOST: str('https://us.i.posthog.com'),
  POSTHOG_PROJECT_API_KEY: str(),

  AUTH_RISK_BLOCK_THRESHOLD: int(0),
  PLATFORM_OWNER_EMAIL: str(),
  // Where a magic-auth OTP code is POSTed for delivery. Unset means the code is
  // not delivered out-of-band, which is how a local environment runs.
  EMAIL_AUTH_OTP_DELIVERY_URL: str(),

  STRIPE_SECRET_KEY: str(),
  STRIPE_WEBHOOK_SECRET: str(),
  BILLING_API_URL: z.string().optional(),
  BILLING_URL: z.string().optional(),
  BILLING_INTERNAL_KEY: str(),
  BILLING_RUN_INTERVAL_SECONDS: int(3600),
  FINANCE_PROVISIONING_POLL_SECONDS: int(30, 5, 300),
  FINANCE_PROVISIONING_BATCH_SIZE: int(25, 1, 100),

  TWILIO_MODE: z
    .enum(['disabled', 'fake', 'live'])
    .optional()
    .transform((value) => value ?? 'disabled'),
  TWILIO_ACCOUNT_SID: str(),
  TWILIO_API_KEY: str(),
  TWILIO_API_KEY_SECRET: str(),
  TWILIO_AUTH_TOKEN: str(),
  TWILIO_VERIFY_SERVICE_SID: str(),
  TWILIO_MESSAGING_SERVICE_SID: str(),
  TWILIO_VOICE_FROM_NUMBER: str(),
  TWILIO_WHATSAPP_FROM: str(),
  TWILIO_WHATSAPP_CONTENT_SID: str(),
  TWILIO_WEBHOOK_BASE_URL: str(),
  TWILIO_LOOKUP_ENABLED: booleanish(false),
  TWILIO_LOOKUP_LINE_TYPE_ENABLED: booleanish(false),
  TWILIO_LOOKUP_CACHE_TTL_SECONDS: int(30 * 24 * 60 * 60),
  TWILIO_VERIFY_SMS_ENABLED: booleanish(false),
  TWILIO_VERIFY_CALL_ENABLED: booleanish(false),
  TWILIO_VERIFY_WHATSAPP_ENABLED: booleanish(false),
  TWILIO_SMS_ENABLED: booleanish(false),
  TWILIO_WHATSAPP_ENABLED: booleanish(false),
  TWILIO_VOICE_ENABLED: booleanish(false),
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
  const twilioLive = (...required: string[]) =>
    e.TWILIO_MODE === 'live' &&
    required.every((value) => value.trim().length > 0)

  return Object.freeze({
    port: e.PORT,
    environment: e.ENVIRONMENT,
    isProduction: e.IS_PRODUCTION,
    logLevel: e.LOG_LEVEL,
    deletionMode: e.DELETION_MODE,

    databaseUrl: e.DATABASE_URL,
    internalKey: e.API_INTERNAL_KEY,

    corsOrigins: e.CORS_ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    socialProviders: e.ENABLED_SOCIAL_PROVIDERS.split(',')
      .map((provider) => provider.trim())
      .filter(Boolean),

    workos: {
      apiKey: e.WORKOS_API_KEY,
      clientId: e.WORKOS_CLIENT_ID,
      redirectUri: e.NEXT_PUBLIC_WORKOS_REDIRECT_URI,
      cookiePassword: e.WORKOS_COOKIE_PASSWORD,
      // A configured override wins so a test or a self-hosted environment can
      // point at its own JWKS without reaching WorkOS.
      jwksUrl:
        e.WORKOS_JWKS_URL ||
        `https://api.workos.com/sso/jwks/${e.WORKOS_CLIENT_ID}`,
      vaultEnabled: e.WORKOS_VAULT_ENABLED,
      vaultKeyContext: e.WORKOS_VAULT_KEY_CONTEXT,
    },

    oauth: {
      issuer: e.OAUTH_ISSUER,
      siteUrl: e.NEXT_PUBLIC_SITE_URL,
      privateKey: e.OAUTH_PRIVATE_KEY,
      keyId: e.OAUTH_KEY_ID,
      accessTokenTtlSeconds: e.OAUTH_ACCESS_TOKEN_TTL_SECONDS,
      refreshTokenTtlSeconds: e.OAUTH_REFRESH_TOKEN_TTL_SECONDS,
    },

    session: {
      cookieName: e.SESSION_COOKIE_NAME,
      // WORKOS_COOKIE_PASSWORD is the legacy name for the same secret; the dev
      // fallback exists so a fresh checkout boots, and is unreachable in
      // production, where an unset secret must stay empty and fail loudly at
      // the point of use.
      cookieSecret:
        e.SESSION_COOKIE_SECRET ||
        e.WORKOS_COOKIE_PASSWORD ||
        (e.IS_PRODUCTION
          ? ''
          : 'dev-only-session-cookie-secret-change-before-production'),
      cookieSecure: e.COOKIE_SECURE ?? e.IS_PRODUCTION,
    },

    crypto: {
      secureFieldKey: e.SECURE_FIELD_KEY,
      identificationHashPepper: e.IDENTIFICATION_HASH_PEPPER,
    },

    sentryDsn: e.SENTRY_DSN,
    posthog: {
      personalApiKey: e.POSTHOG_PERSONAL_API_KEY,
      projectId: e.POSTHOG_PROJECT_ID,
      host: e.POSTHOG_HOST,
      // Event capture uses the project (publishable) key, not the personal API
      // key — different credentials against different endpoints.
      projectApiKey: e.POSTHOG_PROJECT_API_KEY,
    },

    authRiskBlockThreshold: e.AUTH_RISK_BLOCK_THRESHOLD,
    platformOwnerEmail: e.PLATFORM_OWNER_EMAIL,
    emailAuthOtpDeliveryUrl: e.EMAIL_AUTH_OTP_DELIVERY_URL.trim(),

    stripe: {
      secretKey: e.STRIPE_SECRET_KEY,
      webhookSecret: e.STRIPE_WEBHOOK_SECRET,
    },

    billing: {
      url: e.BILLING_API_URL ?? e.BILLING_URL ?? '',
      internalKey: e.BILLING_INTERNAL_KEY,
      runIntervalSeconds: e.BILLING_RUN_INTERVAL_SECONDS,
      financeProvisioningPollSeconds: e.FINANCE_PROVISIONING_POLL_SECONDS,
      financeProvisioningBatchSize: e.FINANCE_PROVISIONING_BATCH_SIZE,
    },

    twilio: {
      mode: e.TWILIO_MODE,
      accountSid: e.TWILIO_ACCOUNT_SID,
      apiKey: e.TWILIO_API_KEY,
      apiKeySecret: e.TWILIO_API_KEY_SECRET,
      authToken: e.TWILIO_AUTH_TOKEN,
      verifyServiceSid: e.TWILIO_VERIFY_SERVICE_SID,
      messagingServiceSid: e.TWILIO_MESSAGING_SERVICE_SID,
      voiceFromNumber: e.TWILIO_VOICE_FROM_NUMBER,
      whatsappFrom: e.TWILIO_WHATSAPP_FROM,
      whatsappContentSid: e.TWILIO_WHATSAPP_CONTENT_SID,
      webhookBaseUrl: e.TWILIO_WEBHOOK_BASE_URL,
      lookupEnabled: e.TWILIO_LOOKUP_ENABLED,
      lookupLineTypeEnabled: e.TWILIO_LOOKUP_LINE_TYPE_ENABLED,
      lookupCacheTtlSeconds: e.TWILIO_LOOKUP_CACHE_TTL_SECONDS,
      verifySmsEnabled: e.TWILIO_VERIFY_SMS_ENABLED,
      verifyCallEnabled: e.TWILIO_VERIFY_CALL_ENABLED,
      verifyWhatsappEnabled: e.TWILIO_VERIFY_WHATSAPP_ENABLED,
      smsEnabled: e.TWILIO_SMS_ENABLED,
      whatsappEnabled: e.TWILIO_WHATSAPP_ENABLED,
      voiceEnabled: e.TWILIO_VOICE_ENABLED,

      // Live traffic needs credentials AND the specific resource for that
      // channel — a mode flip alone must never start billing real messages.
      verifyLive: twilioLive(
        e.TWILIO_API_KEY,
        e.TWILIO_API_KEY_SECRET,
        e.TWILIO_VERIFY_SERVICE_SID
      ),
      messagingLive: twilioLive(
        e.TWILIO_API_KEY,
        e.TWILIO_API_KEY_SECRET,
        e.TWILIO_ACCOUNT_SID,
        e.TWILIO_MESSAGING_SERVICE_SID
      ),
      voiceLive: twilioLive(
        e.TWILIO_API_KEY,
        e.TWILIO_API_KEY_SECRET,
        e.TWILIO_ACCOUNT_SID,
        e.TWILIO_VOICE_FROM_NUMBER
      ),
      // Lookup needs REST credentials but no Verify service.
      lookupLive: twilioLive(e.TWILIO_API_KEY, e.TWILIO_API_KEY_SECRET),
    },
  })
}

export type Settings = ReturnType<typeof build>

let cached: Settings | undefined

export function getSettings(): Settings {
  cached ??= build(process.env)
  return cached
}

/** Test-only: rebuild settings from an explicit environment. */
export function resetSettingsForTest(env?: NodeJS.ProcessEnv): Settings {
  cached = build(env ?? process.env)
  return cached
}

/** Case-insensitive check against the configured platform owner address. */
export function isPlatformOwnerEmail(
  email: string | null | undefined
): boolean {
  const owner = getSettings().platformOwnerEmail.trim().toLowerCase()
  return owner.length > 0 && (email ?? '').trim().toLowerCase() === owner
}
