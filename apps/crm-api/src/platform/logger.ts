import { AsyncLocalStorage } from 'node:async_hooks'

import { pino, type Logger } from 'pino'

const SENSITIVE_FIELD_NAMES = new Set([
  'authorization',
  'api_key',
  'apikey',
  'x_api_key',
  'x_876_api_key',
  'x_internal_key',
  'internal_key',
  'internalkey',
  'bearer_token',
  'token',
  'access_token',
  'refresh_token',
  'client_secret',
  'clientsecret',
  'credentialref',
  'credential_ref',
  'key_hash',
  'keyhash',
  'password',
  'secret',
  'cookie',
  'session',
])

const REDACTED = '[redacted]'

export type Actor = {
  kind?: string
  userId?: string
  appId?: string
  tenantId?: string
  organizationId?: string
}

type RequestContext = { requestId: string; actor: Actor }

const storage = new AsyncLocalStorage<RequestContext>()

export function runWithRequestContext<T>(requestId: string, fn: () => T): T {
  return storage.run({ requestId, actor: {} }, fn)
}

export function getRequestId(): string {
  return storage.getStore()?.requestId ?? ''
}

export function bindActor(fields: Actor): void {
  const store = storage.getStore()
  if (!store) return

  for (const [key, value] of Object.entries(fields))
    if (value !== undefined && value !== null)
      store.actor[key as keyof Actor] = value as never
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1))

  const output: Record<string, unknown> = {}
  for (const [key, nested] of Object.entries(value as Record<string, unknown>))
    output[key] = SENSITIVE_FIELD_NAMES.has(key.toLowerCase())
      ? REDACTED
      : redact(nested, depth + 1)

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
    messageKey: 'event',
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    formatters: { level: (label) => ({ level: label }) },
    hooks: {
      logMethod(args, method) {
        const [first, ...rest] = args
        if (first && typeof first === 'object')
          return method.apply(this, [
            redact(first) as object,
            ...rest,
          ] as Parameters<typeof method>)
        return method.apply(this, args)
      },
    },
    mixin() {
      const requestId = getRequestId()
      return {
        ...(requestId ? { request_id: requestId } : {}),
        ...storage.getStore()?.actor,
      }
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

export function getLogger(name: string): Logger {
  if (!root)
    configureLogging({
      environment: process.env.ENVIRONMENT ?? 'development',
      logLevel: process.env.LOG_LEVEL ?? 'info',
    })

  return root!.child({ logger: name })
}
