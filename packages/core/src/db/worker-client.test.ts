import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  CROSS_REQUEST_IO_MESSAGE,
  DatabaseConnectionReusedError,
  DatabaseQueryTimeoutError,
  createQueryGuard,
  createRequestScopedResolver,
  getRequestScope,
  isCrossRequestIoError,
  isWorkerdRuntime,
} from './worker-client'

const cloudflareContextSymbol = Symbol.for('__cloudflare-context__')

/** Installs a Cloudflare request context, mimicking OpenNext's global getter. */
function withRequestScope(ctx: object | undefined): () => void {
  Object.defineProperty(globalThis, cloudflareContextSymbol, {
    configurable: true,
    get: () => (ctx ? { env: {}, cf: undefined, ctx } : undefined),
  })

  return () => {
    Reflect.deleteProperty(globalThis, cloudflareContextSymbol)
  }
}

/** Pretends the process is workerd for the duration of the returned cleanup. */
function withWorkerdRuntime(): () => void {
  const original = Reflect.getOwnPropertyDescriptor(globalThis, 'navigator')

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { userAgent: 'Cloudflare-Workers' },
  })

  return () => {
    if (original) Object.defineProperty(globalThis, 'navigator', original)
    else Reflect.deleteProperty(globalThis, 'navigator')
  }
}

const cleanups: Array<() => void> = []

function track(cleanup: () => void): void {
  cleanups.push(cleanup)
}

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.()

  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('getRequestScope', () => {
  it('returns undefined when no Cloudflare context is installed', () => {
    expect(getRequestScope()).toBeUndefined()
  })

  it('returns the execution context of the in-flight request', () => {
    const ctx = { id: 'request-1' }
    track(withRequestScope(ctx))

    expect(getRequestScope()).toBe(ctx)
  })

  it('returns undefined when the context exists without an execution context', () => {
    Object.defineProperty(globalThis, cloudflareContextSymbol, {
      configurable: true,
      get: () => ({ env: {}, cf: undefined }),
    })
    track(() => Reflect.deleteProperty(globalThis, cloudflareContextSymbol))

    expect(getRequestScope()).toBeUndefined()
  })
})

describe('isWorkerdRuntime', () => {
  it('returns false under Node', () => {
    expect(isWorkerdRuntime()).toBe(false)
  })

  it('returns true when the navigator reports Cloudflare-Workers', () => {
    track(withWorkerdRuntime())

    expect(isWorkerdRuntime()).toBe(true)
  })
})

describe('isCrossRequestIoError', () => {
  it('identifies the workerd cross-request I/O error', () => {
    const error = new Error(
      `${CROSS_REQUEST_IO_MESSAGE}. I/O objects (such as streams) ... (I/O type: Native)`
    )

    expect(isCrossRequestIoError(error)).toBe(true)
  })

  it('does not match an unrelated database error', () => {
    expect(isCrossRequestIoError(new Error('connection refused'))).toBe(false)
  })

  it('does not match a non-Error value carrying the message', () => {
    expect(isCrossRequestIoError({ message: CROSS_REQUEST_IO_MESSAGE })).toBe(
      false
    )
  })
})

describe('createRequestScopedResolver', () => {
  it('returns the same client for repeated calls within one request', () => {
    track(withRequestScope({ id: 'request-1' }))
    const create = vi.fn(() => ({ client: Symbol('client') }))

    const resolve = createRequestScopedResolver({ create })

    expect(resolve()).toBe(resolve())
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('creates a separate client for each request scope', () => {
    const create = vi.fn(() => ({ client: Symbol('client') }))
    const resolve = createRequestScopedResolver({ create })

    const first = withRequestScope({ id: 'request-1' })
    const clientA = resolve()
    first()

    const second = withRequestScope({ id: 'request-2' })
    const clientB = resolve()
    track(second)

    expect(clientA).not.toBe(clientB)
    expect(create).toHaveBeenCalledTimes(2)
  })

  it('reuses one process client when no request scope exists', () => {
    const create = vi.fn(() => ({ client: Symbol('client') }))

    const resolve = createRequestScopedResolver({ create })

    expect(resolve()).toBe(resolve())
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('adopts an existing process client instead of creating one', () => {
    const adopted = { client: Symbol('adopted') }
    const create = vi.fn(() => ({ client: Symbol('created') }))

    const resolve = createRequestScopedResolver({
      create,
      adoptProcessClient: () => adopted,
    })

    expect(resolve()).toBe(adopted)
    expect(create).not.toHaveBeenCalled()
  })

  it('stores the process client exactly once', () => {
    const storeProcessClient = vi.fn()

    const resolve = createRequestScopedResolver({
      create: () => ({ client: Symbol('client') }),
      storeProcessClient,
    })

    const client = resolve()
    resolve()

    expect(storeProcessClient).toHaveBeenCalledTimes(2)
    expect(storeProcessClient).toHaveBeenCalledWith(client)
  })

  it('never caches on workerd when the request scope is missing', () => {
    track(withWorkerdRuntime())
    const create = vi.fn(() => ({ client: Symbol('client') }))

    const resolve = createRequestScopedResolver({ create })

    expect(resolve()).not.toBe(resolve())
    expect(create).toHaveBeenCalledTimes(2)
  })

  it('reports a missing workerd request scope exactly once per isolate', () => {
    track(withWorkerdRuntime())
    const onMissingScope = vi.fn()

    const resolve = createRequestScopedResolver({
      create: () => ({ client: Symbol('client') }),
      onMissingScope,
    })

    resolve()
    resolve()

    expect(onMissingScope).toHaveBeenCalledTimes(1)
  })

  it('does not report a missing scope under Node', () => {
    const onMissingScope = vi.fn()

    const resolve = createRequestScopedResolver({
      create: () => ({ client: Symbol('client') }),
      onMissingScope,
    })

    resolve()

    expect(onMissingScope).not.toHaveBeenCalled()
  })
})

describe('createQueryGuard', () => {
  it('passes the query result through untouched', async () => {
    const guard = createQueryGuard()

    const result = await guard({
      model: 'Tenant',
      operation: 'findFirst',
      args: { where: { slug: '8-7-6' } },
      query: async (args) => ({ received: args }),
    })

    expect(result).toEqual({ received: { where: { slug: '8-7-6' } } })
  })

  it('does not report a successful query', async () => {
    const onFailure = vi.fn()
    const guard = createQueryGuard({ onFailure })

    await guard({
      model: 'Tenant',
      operation: 'findFirst',
      args: {},
      query: async () => null,
    })

    expect(onFailure).not.toHaveBeenCalled()
  })

  it('rejects with a DatabaseQueryTimeoutError once the budget elapses', async () => {
    vi.useFakeTimers()
    const guard = createQueryGuard({ timeoutMs: 5_000 })

    const pending = guard({
      model: 'Tenant',
      operation: 'findFirst',
      args: {},
      query: () => new Promise(() => {}),
    })
    const assertion = expect(pending).rejects.toThrow(DatabaseQueryTimeoutError)

    await vi.advanceTimersByTimeAsync(5_000)

    await assertion
  })

  it('names the operation and budget in the timeout message', async () => {
    vi.useFakeTimers()
    const guard = createQueryGuard({ timeoutMs: 5_000 })

    const pending = guard({
      model: 'Tenant',
      operation: 'findFirst',
      args: {},
      query: () => new Promise(() => {}),
    })
    const assertion = expect(pending).rejects.toThrow(
      'Database query timed out after 5000ms (Tenant.findFirst)'
    )

    await vi.advanceTimersByTimeAsync(5_000)

    await assertion
  })

  it('reports a timeout as timedOut and not cross-request I/O', async () => {
    vi.useFakeTimers()
    const onFailure = vi.fn()
    const guard = createQueryGuard({ timeoutMs: 5_000, onFailure })

    const pending = guard({
      model: 'Tenant',
      operation: 'findFirst',
      args: {},
      query: () => new Promise(() => {}),
    })
    const assertion = expect(pending).rejects.toThrow(DatabaseQueryTimeoutError)

    await vi.advanceTimersByTimeAsync(5_000)
    await assertion

    expect(onFailure).toHaveBeenCalledTimes(1)
    expect(onFailure.mock.calls[0]?.[1]).toEqual({
      operation: 'findFirst',
      model: 'Tenant',
      crossRequestIo: false,
      timedOut: true,
    })
  })

  it('translates cross-request I/O into DatabaseConnectionReusedError', async () => {
    const guard = createQueryGuard()
    const cause = new Error(`${CROSS_REQUEST_IO_MESSAGE} (I/O type: Native)`)

    await expect(
      guard({
        model: 'Tenant',
        operation: 'findFirst',
        args: {},
        query: async () => {
          throw cause
        },
      })
    ).rejects.toThrow(DatabaseConnectionReusedError)
  })

  it('keeps the original workerd error as the cause', async () => {
    const guard = createQueryGuard()
    const cause = new Error(`${CROSS_REQUEST_IO_MESSAGE} (I/O type: Native)`)

    const error = await guard({
      model: 'Tenant',
      operation: 'findFirst',
      args: {},
      query: async () => {
        throw cause
      },
    }).catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(DatabaseConnectionReusedError)
    expect((error as DatabaseConnectionReusedError).cause).toBe(cause)
    expect((error as DatabaseConnectionReusedError).operation).toBe(
      'Tenant.findFirst'
    )
  })

  it('reports cross-request I/O with crossRequestIo set', async () => {
    const onFailure = vi.fn()
    const guard = createQueryGuard({ onFailure })

    await guard({
      model: 'Tenant',
      operation: 'findFirst',
      args: {},
      query: async () => {
        throw new Error(CROSS_REQUEST_IO_MESSAGE)
      },
    }).catch(() => undefined)

    expect(onFailure).toHaveBeenCalledTimes(1)
    expect(onFailure.mock.calls[0]?.[1]).toEqual({
      operation: 'findFirst',
      model: 'Tenant',
      crossRequestIo: true,
      timedOut: false,
    })
  })

  it('rethrows an unrelated database error unchanged', async () => {
    const guard = createQueryGuard()
    const cause = new Error('duplicate key value violates unique constraint')

    await expect(
      guard({
        model: 'Tenant',
        operation: 'create',
        args: {},
        query: async () => {
          throw cause
        },
      })
    ).rejects.toBe(cause)
  })

  it('labels a model-less operation by its operation name alone', async () => {
    const onFailure = vi.fn()
    const guard = createQueryGuard({ onFailure })

    const error = await guard({
      operation: '$queryRaw',
      args: {},
      query: async () => {
        throw new Error(CROSS_REQUEST_IO_MESSAGE)
      },
    }).catch((thrown: unknown) => thrown)

    expect((error as DatabaseConnectionReusedError).operation).toBe('$queryRaw')
    expect(onFailure.mock.calls[0]?.[1]).toEqual({
      operation: '$queryRaw',
      model: undefined,
      crossRequestIo: true,
      timedOut: false,
    })
  })

  it('clears the timeout timer once the query resolves', async () => {
    vi.useFakeTimers()
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
    const guard = createQueryGuard({ timeoutMs: 5_000 })

    await guard({
      model: 'Tenant',
      operation: 'findFirst',
      args: {},
      query: async () => null,
    })

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1)
  })
})
