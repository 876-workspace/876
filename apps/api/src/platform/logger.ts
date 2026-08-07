import { AsyncLocalStorage } from 'node:async_hooks'

import { pino, type Logger } from 'pino'

import { getSettings } from '@/config'

/**
 * Field names whose values must never reach log output.
 *
 * This is defence in depth behind the convention of never passing a secret to
 * the logger: one careless field should not emit a live credential. Matching is
 * case-insensitive on the exact key, at any depth.
 */
const SENSITIVE_FIELD_NAMES = new Set([
  'authorization',
  'api_key',
  'apikey',
  'apiKey',
  'x_api_key',
  'x_876_api_key',
  'x_internal_key',
  'internal_key',
  'internalKey',
  'bearer_token',
  'token',
  'id_token',
  'id_token_hint',
  'refresh_token',
  'access_token',
  'client_secret',
  'client_secret_hash',
  'clientSecret',
  'key_hash',
  'keyHash',
  'plaintext',
  'password',
  'new_password',
  'code',
  'code_verifier',
  'code_challenge',
  'session',
  'cookie',
  'otp_code',
  'otp',
  'secret',
  'pin',
])

const REDACTED = '[redacted]'

/** Identity of the principal acting on the current request. Non-PII only. */
export type Actor = {
  userId?: string
  appId?: string
  apiKeyId?: string
  realm?: string
  internal?: boolean
}

type RequestContext = {
  requestId: string
  actor: Actor
}

const storage = new AsyncLocalStorage<RequestContext>()

export function runWithRequestContext<T>(requestId: string, fn: () => T): T {
  return storage.run({ requestId, actor: {} }, fn)
}

export function getRequestId(): string {
  return storage.getStore()?.requestId ?? ''
}

/**
 * Merge identity onto the current request's context so every later log line
 * carries it without the call site repeating it. Undefined values are ignored,
 * so a partial bind never erases what an earlier one established.
 */
export function bindActor(fields: Actor): void {
  const store = storage.getStore()
  if (!store) return

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) {
      store.actor[key as keyof Actor] = value as never
    }
  }
}

export function getActor(): Actor {
  return storage.getStore()?.actor ?? {}
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1))

  const output: Record<string, unknown> = {}
  for (const [key, nested] of Object.entries(
    value as Record<string, unknown>
  )) {
    output[key] = SENSITIVE_FIELD_NAMES.has(key.toLowerCase())
      ? REDACTED
      : redact(nested, depth + 1)
  }

  return output
}

let root: Logger | undefined

export function configureLogging(options: {
  environment: string
  logLevel: string
}): void {
  const isDevelopment = options.environment === 'development'

  root = pino({
    level: options.logLevel.toLowerCase(),
    base: undefined,
    // The FastAPI service emitted `event` as the message key and an ISO
    // timestamp; keeping both means existing log queries and Sentry breadcrumb
    // parsing keep working across the cutover.
    messageKey: 'event',
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    formatters: {
      level: (label) => ({ level: label }),
    },
    // Redaction happens in the mixin (which sees the merged object) rather than
    // pino's own `redact` paths, because the sensitive keys can appear at any
    // depth under names we do not enumerate up front.
    hooks: {
      logMethod(args, method) {
        const [first, ...rest] = args
        if (first && typeof first === 'object') {
          return method.apply(this, [
            redact(first) as object,
            ...rest,
          ] as Parameters<typeof method>)
        }
        return method.apply(this, args)
      },
    },
    mixin() {
      const requestId = getRequestId()
      return { ...(requestId ? { request_id: requestId } : {}), ...getActor() }
    },
    ...(isDevelopment
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              messageKey: 'event',
              translateTime: 'HH:MM:ss',
            },
          },
        }
      : {}),
  })
}

/**
 * Return a logger bound to a module name.
 *
 * Callers log an event name plus structured fields — `log.info({ path },
 * 'request_completed')` — never an interpolated sentence. The event name is
 * what dashboards group on.
 */
export function getLogger(name: string): Logger {
  // A module that logs at import time runs before server.ts calls
  // configureLogging. Reading the settings here rather than assuming defaults
  // is what keeps LOG_LEVEL honoured in that window — the alternative silently
  // logs at `info` in production regardless of configuration, and floods test
  // output.
  if (!root) {
    const { environment, logLevel } = getSettings()
    configureLogging({ environment, logLevel })
  }

  return root!.child({ logger: name })
}
