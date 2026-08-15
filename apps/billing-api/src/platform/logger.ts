import { AsyncLocalStorage } from 'node:async_hooks'

import { pino, type Logger } from 'pino'

import { getSettings } from '@/config'

type RequestContext = {
  requestId: string
  actor: Record<string, string | boolean>
}

const storage = new AsyncLocalStorage<RequestContext>()
const sensitive = new Set([
  'authorization',
  'api_key',
  'apikey',
  'token',
  'password',
  'secret',
  'x_876_api_key',
  'x_internal_key',
  'x_scheduler_key',
])

export function runWithRequestContext<T>(requestId: string, fn: () => T): T {
  return storage.run({ requestId, actor: {} }, fn)
}

export function getRequestId(): string {
  return storage.getStore()?.requestId ?? ''
}

export function bindActor(actor: Record<string, string | boolean>): void {
  const context = storage.getStore()
  if (context) Object.assign(context.actor, actor)
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1))
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
      key,
      sensitive.has(key.toLowerCase())
        ? '[redacted]'
        : redact(nested, depth + 1),
    ])
  )
}

let root: Logger | undefined

export function configureLogging(options: {
  environment: string
  logLevel: string
}): void {
  root = pino({
    level: options.logLevel.toLowerCase(),
    base: undefined,
    messageKey: 'event',
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    formatters: { level: (label) => ({ level: label }) },
    hooks: {
      logMethod(args, method) {
        const [first, ...rest] = args
        return first && typeof first === 'object'
          ? method.apply(this, [redact(first) as object, ...rest] as Parameters<
              typeof method
            >)
          : method.apply(this, args)
      },
    },
    mixin() {
      const context = storage.getStore()
      return {
        ...(context?.requestId ? { request_id: context.requestId } : {}),
        ...(context?.actor ?? {}),
      }
    },
    ...(options.environment === 'development'
      ? { transport: { target: 'pino-pretty' } }
      : {}),
  })
}

export function getLogger(name: string): Logger {
  if (!root) {
    const settings = getSettings()
    configureLogging({
      environment: settings.environment,
      logLevel: settings.logLevel,
    })
  }
  return root!.child({ logger: name })
}
