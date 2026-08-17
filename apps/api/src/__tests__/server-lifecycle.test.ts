import { describe, expect, it, vi } from 'vitest'
import { createServerLifecycle } from '../server'

describe('Server Lifecycle', () => {
  it('starts finance worker once on boot when finance provisioning is enabled', async () => {
    const listenMock = vi.fn((_port, _host, callback) => {
      if (callback) callback()
      return { close: vi.fn((cb) => cb?.()) }
    })
    const createAppMock = vi.fn(() => ({
      listen: listenMock,
    })) as unknown as typeof import('../app').createApp
    const getSettingsMock = vi.fn(() => ({
      port: 4000,
      environment: 'test',
      logLevel: 'silent',
      billing: { financeProvisioningDisabled: false },
    })) as unknown as typeof import('../config').getSettings
    const startFinanceWorkerMock = vi.fn(() => ({
      stop: vi.fn().mockResolvedValue(undefined),
    }))
    const disconnectDbMock = vi.fn().mockResolvedValue(undefined)

    const lifecycle = createServerLifecycle({
      createApp: createAppMock,
      getSettings: getSettingsMock,
      startFinanceWorker: startFinanceWorkerMock,
      disconnectDb: disconnectDbMock,
    })

    expect(listenMock).toHaveBeenCalledOnce()
    expect(startFinanceWorkerMock).toHaveBeenCalledOnce()

    await lifecycle.stop('SIGTERM')
  })

  it('does not start finance worker when financeProvisioningDisabled is true', async () => {
    const listenMock = vi.fn((_port, _host, callback) => {
      if (callback) callback()
      return { close: vi.fn((cb) => cb?.()) }
    })
    const createAppMock = vi.fn(() => ({
      listen: listenMock,
    })) as unknown as typeof import('../app').createApp
    const getSettingsMock = vi.fn(() => ({
      port: 4000,
      environment: 'test',
      logLevel: 'silent',
      billing: { financeProvisioningDisabled: true },
    })) as unknown as typeof import('../config').getSettings
    const startFinanceWorkerMock = vi.fn(() => ({
      stop: vi.fn().mockResolvedValue(undefined),
    }))
    const disconnectDbMock = vi.fn().mockResolvedValue(undefined)

    const lifecycle = createServerLifecycle({
      createApp: createAppMock,
      getSettings: getSettingsMock,
      startFinanceWorker: startFinanceWorkerMock,
      disconnectDb: disconnectDbMock,
    })

    expect(listenMock).toHaveBeenCalledOnce()
    expect(startFinanceWorkerMock).not.toHaveBeenCalled()

    await lifecycle.stop('SIGTERM')
  })

  it('shuts down cleanly: stops worker, awaits completion, and disconnects DB afterwards', async () => {
    const executionOrder: string[] = []

    const closeMock = vi.fn((cb) => {
      executionOrder.push('server.close')
      cb?.()
    })
    const listenMock = vi.fn((_port, _host, callback) => {
      if (callback) callback()
      return { close: closeMock }
    })
    const createAppMock = vi.fn(() => ({
      listen: listenMock,
    })) as unknown as typeof import('../app').createApp
    const getSettingsMock = vi.fn(() => ({
      port: 4000,
      environment: 'test',
      logLevel: 'silent',
      billing: { financeProvisioningDisabled: false },
    })) as unknown as typeof import('../config').getSettings

    const workerStopMock = vi.fn(async () => {
      executionOrder.push('worker.stop_start')
      await new Promise((r) => setTimeout(r, 10))
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
      getSettings: getSettingsMock,
      startFinanceWorker: startFinanceWorkerMock,
      disconnectDb: disconnectDbMock,
    })

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
    const closeMock = vi.fn((cb) => cb?.())
    const listenMock = vi.fn((_port, _host, callback) => {
      if (callback) callback()
      return { close: closeMock }
    })
    const createAppMock = vi.fn(() => ({
      listen: listenMock,
    })) as unknown as typeof import('../app').createApp
    const getSettingsMock = vi.fn(() => ({
      port: 4000,
      environment: 'test',
      logLevel: 'silent',
      billing: { financeProvisioningDisabled: false },
    })) as unknown as typeof import('../config').getSettings

    const workerStopMock = vi.fn(async () => {
      throw new Error('Worker stop failed')
    })
    const startFinanceWorkerMock = vi.fn(() => ({
      stop: workerStopMock,
    }))
    const disconnectDbMock = vi.fn().mockResolvedValue(undefined)

    const lifecycle = createServerLifecycle({
      createApp: createAppMock,
      getSettings: getSettingsMock,
      startFinanceWorker: startFinanceWorkerMock,
      disconnectDb: disconnectDbMock,
    })

    await expect(lifecycle.stop('SIGTERM')).resolves.toBeUndefined()
    expect(disconnectDbMock).toHaveBeenCalledOnce()
  })
})
