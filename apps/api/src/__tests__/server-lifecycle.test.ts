import { describe, expect, it, vi } from 'vitest'

import { createServerLifecycle } from '../server'

function serverSettings(options?: {
  financeProvisioningDisabled?: boolean
  url?: string
  internalKey?: string
  featureFlagSyncEnabled?: boolean
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
    posthog: { projectApiKey: '', host: '', personalApiKey: '' },
    featureFlags: {
      syncEnabled: options?.featureFlagSyncEnabled ?? false,
      syncIntervalSeconds: 300,
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
  }) as unknown as typeof import('../application').createApp

  return { closeMock, listenMock, createAppMock }
}

function workerStarter(
  stop: () => Promise<void> = vi.fn().mockResolvedValue(undefined)
) {
  return vi.fn(() => ({ stop }))
}

describe('Server Lifecycle', () => {
  it('validates finance configuration before creating or listening on the app', async () => {
    const executionOrder: string[] = []
    const { createAppMock, listenMock } = appHarness(executionOrder)
    const assertFinanceConfiguration = vi.fn(() => {
      executionOrder.push('finance.preflight')
    })
    const startFinanceWorker = workerStarter()
    const startBillingWorker = workerStarter()

    const lifecycle = createServerLifecycle({
      createApp: createAppMock,
      getSettings: vi.fn(() =>
        serverSettings()
      ) as unknown as typeof import('../config').getSettings,
      assertFinanceConfiguration,
      startBillingWorker,
      startFinanceWorker,
      disconnectDb: vi.fn().mockResolvedValue(undefined),
    })

    expect(executionOrder.slice(0, 3)).toEqual([
      'finance.preflight',
      'createApp',
      'server.listen',
    ])
    expect(listenMock).toHaveBeenCalledOnce()
    expect(startBillingWorker).toHaveBeenCalledOnce()
    expect(startFinanceWorker).toHaveBeenCalledOnce()

    await lifecycle.stop('SIGTERM')
  })

  it('does not create the app, bind a port, or start the worker when preflight fails', () => {
    const { createAppMock, listenMock } = appHarness()
    const startFinanceWorker = workerStarter()
    const startBillingWorker = workerStarter()

    expect(() =>
      createServerLifecycle({
        createApp: createAppMock,
        getSettings: vi.fn(() =>
          serverSettings({ url: '' })
        ) as unknown as typeof import('../config').getSettings,
        startBillingWorker,
        startFinanceWorker,
        disconnectDb: vi.fn().mockResolvedValue(undefined),
      })
    ).toThrow('BILLING_API_URL/BILLING_URL is missing')

    expect(createAppMock).not.toHaveBeenCalled()
    expect(listenMock).not.toHaveBeenCalled()
    expect(startBillingWorker).not.toHaveBeenCalled()
    expect(startFinanceWorker).not.toHaveBeenCalled()
  })

  it('starts finance worker once on boot when finance provisioning is enabled', async () => {
    const { listenMock, createAppMock } = appHarness()
    const startBillingWorkerMock = workerStarter()
    const startFinanceWorkerMock = workerStarter()
    const disconnectDbMock = vi.fn().mockResolvedValue(undefined)

    const lifecycle = createServerLifecycle({
      createApp: createAppMock,
      getSettings: vi.fn(() =>
        serverSettings()
      ) as unknown as typeof import('../config').getSettings,
      startBillingWorker: startBillingWorkerMock,
      startFinanceWorker: startFinanceWorkerMock,
      disconnectDb: disconnectDbMock,
    })

    expect(listenMock).toHaveBeenCalledOnce()
    expect(startFinanceWorkerMock).toHaveBeenCalledOnce()

    await lifecycle.stop('SIGTERM')
  })

  it('starts billing customer sync when Billing is configured', async () => {
    const { createAppMock } = appHarness()
    const startBillingWorkerMock = workerStarter()
    const startFinanceWorkerMock = workerStarter()

    const lifecycle = createServerLifecycle({
      createApp: createAppMock,
      getSettings: vi.fn(() =>
        serverSettings()
      ) as unknown as typeof import('../config').getSettings,
      startBillingWorker: startBillingWorkerMock,
      startFinanceWorker: startFinanceWorkerMock,
      disconnectDb: vi.fn().mockResolvedValue(undefined),
    })

    expect(startBillingWorkerMock).toHaveBeenCalledOnce()

    await lifecycle.stop('SIGTERM')
  })

  it('starts feature-flag sync when enabled', async () => {
    const { createAppMock } = appHarness()
    const startBillingWorkerMock = workerStarter()
    const startFinanceWorkerMock = workerStarter()
    const startFeatureFlagSyncWorkerMock = workerStarter()

    const lifecycle = createServerLifecycle({
      createApp: createAppMock,
      getSettings: vi.fn(() =>
        serverSettings({ featureFlagSyncEnabled: true })
      ) as unknown as typeof import('../config').getSettings,
      startBillingWorker: startBillingWorkerMock,
      startFinanceWorker: startFinanceWorkerMock,
      startFeatureFlagSyncWorker: startFeatureFlagSyncWorkerMock,
      disconnectDb: vi.fn().mockResolvedValue(undefined),
    })

    expect(startFeatureFlagSyncWorkerMock).toHaveBeenCalledOnce()

    await lifecycle.stop('SIGTERM')
  })

  it('starts billing customer sync independently of finance provisioning', async () => {
    const { createAppMock } = appHarness()
    const startBillingWorkerMock = workerStarter()
    const startFinanceWorkerMock = workerStarter()

    const lifecycle = createServerLifecycle({
      createApp: createAppMock,
      getSettings: vi.fn(() =>
        serverSettings({ financeProvisioningDisabled: true })
      ) as unknown as typeof import('../config').getSettings,
      startBillingWorker: startBillingWorkerMock,
      startFinanceWorker: startFinanceWorkerMock,
      disconnectDb: vi.fn().mockResolvedValue(undefined),
    })

    expect(startBillingWorkerMock).toHaveBeenCalledOnce()
    expect(startFinanceWorkerMock).not.toHaveBeenCalled()

    await lifecycle.stop('SIGTERM')
  })

  it('does not start billing customer sync without Billing credentials', async () => {
    const { createAppMock } = appHarness()
    const startBillingWorkerMock = workerStarter()
    const startFinanceWorkerMock = workerStarter()

    const lifecycle = createServerLifecycle({
      createApp: createAppMock,
      getSettings: vi.fn(() =>
        serverSettings({
          financeProvisioningDisabled: true,
          url: '',
          internalKey: '',
        })
      ) as unknown as typeof import('../config').getSettings,
      startBillingWorker: startBillingWorkerMock,
      startFinanceWorker: startFinanceWorkerMock,
      disconnectDb: vi.fn().mockResolvedValue(undefined),
    })

    expect(startBillingWorkerMock).not.toHaveBeenCalled()

    await lifecycle.stop('SIGTERM')
  })

  it('does not start finance worker when financeProvisioningDisabled is true', async () => {
    const { listenMock, createAppMock } = appHarness()
    const startBillingWorkerMock = workerStarter()
    const startFinanceWorkerMock = workerStarter()
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
      startBillingWorker: startBillingWorkerMock,
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
    const startFinanceWorkerMock = workerStarter(workerStopMock)
    const billingWorkerStopMock = vi.fn(async () => {
      executionOrder.push('billing_worker.stop_start')
      await new Promise((resolve) => setTimeout(resolve, 10))
      executionOrder.push('billing_worker.stop_end')
    })
    const startBillingWorkerMock = workerStarter(billingWorkerStopMock)

    const disconnectDbMock = vi.fn(async () => {
      executionOrder.push('disconnectDb')
    })

    const lifecycle = createServerLifecycle({
      createApp: createAppMock,
      getSettings: vi.fn(() =>
        serverSettings()
      ) as unknown as typeof import('../config').getSettings,
      startBillingWorker: startBillingWorkerMock,
      startFinanceWorker: startFinanceWorkerMock,
      disconnectDb: disconnectDbMock,
    })

    // Boot ordering is not part of shutdown ordering.
    executionOrder.length = 0
    await lifecycle.stop('SIGTERM')

    expect(billingWorkerStopMock).toHaveBeenCalledOnce()
    expect(workerStopMock).toHaveBeenCalledOnce()
    expect(disconnectDbMock).toHaveBeenCalledOnce()
    expect(executionOrder).toEqual([
      'billing_worker.stop_start',
      'billing_worker.stop_end',
      'worker.stop_start',
      'worker.stop_end',
      'server.close',
      'disconnectDb',
    ])
  })

  it('handles worker stop errors gracefully during shutdown without skipping db disconnect', async () => {
    const { createAppMock } = appHarness()
    const billingWorkerStopMock = vi.fn(async () => {
      throw new Error('Billing worker stop failed')
    })
    const financeWorkerStopMock = vi.fn(async () => {
      throw new Error('Finance worker stop failed')
    })
    const startFinanceWorkerMock = workerStarter(financeWorkerStopMock)
    const startBillingWorkerMock = workerStarter(billingWorkerStopMock)
    const disconnectDbMock = vi.fn().mockResolvedValue(undefined)

    const lifecycle = createServerLifecycle({
      createApp: createAppMock,
      getSettings: vi.fn(() =>
        serverSettings()
      ) as unknown as typeof import('../config').getSettings,
      startBillingWorker: startBillingWorkerMock,
      startFinanceWorker: startFinanceWorkerMock,
      disconnectDb: disconnectDbMock,
    })

    await expect(lifecycle.stop('SIGTERM')).resolves.toBeUndefined()
    expect(billingWorkerStopMock).toHaveBeenCalledOnce()
    expect(financeWorkerStopMock).toHaveBeenCalledOnce()
    expect(disconnectDbMock).toHaveBeenCalledOnce()
  })
})
