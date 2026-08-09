import { AsyncLocalStorage } from 'node:async_hooks'

import { pino, type Logger } from 'pino'

import { getSettings } from '@/config'

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
  'clientSecret',
  'key_hash',
  'keyHash',
  'plaintext',
  'password',
  'secret',
  'pin',
])

const REDACTED = '[redacted]'

export type Actor = {
  userId?: string
  appId?: string
  apiKeyId?: string
  internal?: boolean
  // Which user population the caller authenticated as. Worth carrying into the
  // log line: a request that arrives on the wrong realm is the shape of an
  // authorization bug, and without it the line cannot say which realm it was.
  realm?: 'consumer' | 'enterprise'
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
    messageKey: 'event',
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    formatters: { level: (label) => ({ level: label }) },
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

export function getLogger(name: string): Logger {
  if (!root) {
    const { environment, logLevel } = getSettings()
    configureLogging({ environment, logLevel })
  }
  return root!.child({ logger: name })
}
