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
  PORT: optionalNumber(4050),
  ENVIRONMENT: optionalString('development'),
  LOG_LEVEL: optionalString('info'),
  COMMUNICATIONS_DATABASE_URL: z.string().optional(),
  COMMUNICATIONS_INTERNAL_KEY: optionalString(),
  RESEND_API_KEY: optionalString(),
  RESEND_WEBHOOK_SECRET: optionalString(),
  PLATFORM_SENDING_DOMAIN: optionalString('mail.87six.dev'),
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
  const databaseUrl = value.COMMUNICATIONS_DATABASE_URL?.trim() ?? ''
  if (!databaseUrl) {
    throw new Error(
      'COMMUNICATIONS_DATABASE_URL is not configured.'
    )
  }
  try {
    new URL(databaseUrl)
  } catch {
    throw new Error('COMMUNICATIONS_DATABASE_URL is not a valid URL.')
  }

  return Object.freeze({
    port: value.PORT,
    environment: value.ENVIRONMENT,
    logLevel: value.LOG_LEVEL,
    databaseUrl,
    internalKey: value.COMMUNICATIONS_INTERNAL_KEY,
    resendApiKey: value.RESEND_API_KEY,
    resendWebhookSecret: value.RESEND_WEBHOOK_SECRET,
    // The single provider-verified domain backing every `managed` sender. One
    // domain for the whole platform, so onboarding an organization costs no DNS
    // write and no provider call. See .agents/rules/email.md.
    platformSendingDomain: value.PLATFORM_SENDING_DOMAIN.trim().toLowerCase(),
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
