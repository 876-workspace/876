import { describe, expect, it, vi } from 'vitest'

import { createServerLifecycle } from '../server'

function serverSettings(options?: {
  financeProvisioningDisabled?: boolean
  url?: string
  internalKey?: string
}) {
  return {
    port: 4000,
    environment: 'test',
    logLevel: 'silent',
    billing: {
      url: options?.url ?? 'https://billing.example.test',
      internalKey: options?.internalKey ?? 'shared-secret',
      financeProvisioningDisabled:
        options?.financeProvisioningDisabled ?? false,
    },
  }
}

function appHarness(executionOrder?: string[]) {
  const closeMock = vi.fn((cb) => {
    executionOrder?.push('server.close')
    cb?.()
  })
  const listenMock = vi.fn((_port, _host, callback) => {
    executionOrder?.push('server.listen')
    if (callback) callback()
    return { close: closeMock }
  })
  const createAppMock = vi.fn(() => {
    executionOrder?.push('createApp')
    return { listen: listenMock }
  }) as unknown as typeof import('../app').createApp

  return { closeMock, listenMock, createAppMock }
}

describe('Server Lifecycle', () => {
  it('validates finance configuration before creating or listening on the app', async () => {
    const executionOrder: string[] = []
    const { createAppMock, listenMock } = appHarness(executionOrder)
    const assertFinanceConfiguration = vi.fn(() => {
      executionOrder.push('finance.preflight')
    })
    const startFinanceWorker = vi.fn(() => ({
      stop: vi.fn().mockResolvedValue(undefined),
    }))

    const lifecycle = createServerLifecycle({
      createApp: createAppMock,
      getSettings: vi.fn(() => serverSettings()) as unknown as typeof import('../config').getSettings,
      assertFinanceConfiguration,
      startFinanceWorker,
      disconnectDb: vi.fn().mockResolvedValue(undefined),
    })

    expect(executionOrder.slice(0, 3)).toEqual([
      'finance.preflight',
      'createApp',
      'server.listen',
    ])
    expect(listenMock).toHaveBeenCalledOnce()
    expect(startFinanceWorker).toHaveBeenCalledOnce()

    await lifecycle.stop('SIGTERM')
  })

  it('does not create the app, bind a port, or start the worker when preflight fails', () => {
    const { createAppMock, listenMock } = appHarness()
    const startFinanceWorker = vi.fn(() => ({
      stop: vi.fn().mockResolvedValue(undefined),
    }))

    expect(() =>
      createServerLifecycle({
        createApp: createAppMock,
        getSettings: vi.fn(() =>
          serverSettings({ url: '' })
        ) as unknown as typeof import('../config').getSettings,
        startFinanceWorker,
        disconnectDb: vi.fn().mockResolvedValue(undefined),
      })
    ).toThrow('BILLING_API_URL/BILLING_URL is missing')

    expect(createAppMock).not.toHaveBeenCalled()
    expect(listenMock).not.toHaveBeenCalled()
    expect(startFinanceWorker).not.toHaveBeenCalled()
  })

  it('starts finance worker once on boot when finance provisioning is enabled', async () => {
    const { listenMock, createAppMock } = appHarness()
    const startFinanceWorkerMock = vi.fn(() => ({
      stop: vi.fn().mockResolvedValue(undefined),
    }))
    const disconnectDbMock = vi.fn().mockResolvedValue(undefined)

    const lifecycle = createServerLifecycle({
      createApp: createAppMock,
      getSettings: vi.fn(() => serverSettings()) as unknown as typeof import('../config').getSettings,
      startFinanceWorker: startFinanceWorkerMock,
      disconnectDb: disconnectDbMock,
    })

    expect(listenMock).toHaveBeenCalledOnce()
    expect(startFinanceWorkerMock).toHaveBeenCalledOnce()

    await lifecycle.stop('SIGTERM')
  })

  it('does not start finance worker when financeProvisioningDisabled is true', async () => {
    const { listenMock, createAppMock } = appHarness()
    const startFinanceWorkerMock = vi.fn(() => ({
      stop: vi.fn().mockResolvedValue(undefined),
    }))
    const disconnectDbMock = vi.fn().mockResolvedValue(undefined)

    const lifecycle = createServerLifecycle({
      createApp: createAppMock,
      getSettings: vi.fn(() =>
        serverSettings({
          financeProvisioningDisabled: true,
          url: '',
          internalKey: '',
        })
      ) as unknown as typeof import('../config').getSettings,
      startFinanceWorker: startFinanceWorkerMock,
      disconnectDb: disconnectDbMock,
    })

    expect(listenMock).toHaveBeenCalledOnce()
    expect(startFinanceWorkerMock).not.toHaveBeenCalled()

    await lifecycle.stop('SIGTERM')
  })

  it('shuts down cleanly: stops worker, awaits completion, and disconnects DB afterwards', async () => {
    const executionOrder: string[] = []
    const { createAppMock } = appHarness(executionOrder)

    const workerStopMock = vi.fn(async () => {
      executionOrder.push('worker.stop_start')
      await new Promise((resolve) => setTimeout(resolve, 10))
      executionOrder.push('worker.stop_end')
    })
    const startFinanceWorkerMock = vi.fn(() => ({
      stop: workerStopMock,
    }))

    const disconnectDbMock = vi.fn(async () => {
      executionOrder.push('disconnectDb')
    })

    const lifecycle = createServerLifecycle({
      createApp: createAppMock,
      getSettings: vi.fn(() => serverSettings()) as unknown as typeof import('../config').getSettings,
      startFinanceWorker: startFinanceWorkerMock,
      disconnectDb: disconnectDbMock,
    })

    // Boot ordering is not part of shutdown ordering.
    executionOrder.length = 0
    await lifecycle.stop('SIGTERM')

    expect(workerStopMock).toHaveBeenCalledOnce()
    expect(disconnectDbMock).toHaveBeenCalledOnce()
    expect(executionOrder).toEqual([
      'worker.stop_start',
      'worker.stop_end',
      'server.close',
      'disconnectDb',
    ])
  })

  it('handles worker stop errors gracefully during shutdown without skipping db disconnect', async () => {
    const { createAppMock } = appHarness()
    const workerStopMock = vi.fn(async () => {
      throw new Error('Worker stop failed')
    })
    const startFinanceWorkerMock = vi.fn(() => ({
      stop: workerStopMock,
    }))
    const disconnectDbMock = vi.fn().mockResolvedValue(undefined)

    const lifecycle = createServerLifecycle({
      createApp: createAppMock,
      getSettings: vi.fn(() => serverSettings()) as unknown as typeof import('../config').getSettings,
      startFinanceWorker: startFinanceWorkerMock,
      disconnectDb: disconnectDbMock,
    })

    await expect(lifecycle.stop('SIGTERM')).resolves.toBeUndefined()
    expect(disconnectDbMock).toHaveBeenCalledOnce()
  })
})
