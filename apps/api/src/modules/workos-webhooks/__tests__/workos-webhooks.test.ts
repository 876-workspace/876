import { createHmac } from 'node:crypto'

import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as config from '@/config'

const { syncUserFromWorkos } = vi.hoisted(() => ({
  syncUserFromWorkos: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: {},
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

vi.mock('@/modules/users', async () => {
  const { Router } = await import('express')
  const emptyRouter = () => Router()

  return {
    syncUserFromWorkos,
    registerAddressRoutes: emptyRouter,
    registerContactRoutes: emptyRouter,
    registerIdentificationRoutes: emptyRouter,
    registerPinRoutes: emptyRouter,
    registerProfileRoutes: emptyRouter,
    registerSelfRoutes: emptyRouter,
    registerUserCoreRoutes: emptyRouter,
  }
})

const { createApp } = await import('@/application')

const SECRET = 'test-workos-webhook-secret'
const NOW = 1_785_000_000
const BASE_SETTINGS = config.getSettings()

function withWorkosWebhookSecret() {
  vi.spyOn(config, 'getSettings').mockReturnValue({
    ...BASE_SETTINGS,
    workos: { ...BASE_SETTINGS.workos, webhookSecret: SECRET },
  } as never)
}

function sign(raw: string): string {
  const signature = createHmac('sha256', SECRET)
    .update(`${NOW}.${raw}`)
    .digest('hex')
  return `t=${NOW}, v1=${signature}`
}

function post(event: Record<string, unknown>, signature = true) {
  const raw = JSON.stringify(event)
  const req = request(createApp())
    .post('/webhooks/workos/')
    .set('Content-Type', 'application/json')
    .send(raw)

  return signature ? req.set('WorkOS-Signature', sign(raw)) : req
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW * 1000)
  withWorkosWebhookSecret()
  syncUserFromWorkos.mockResolvedValue(true)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('POST /webhooks/workos/', () => {
  it('applies a valid user.updated event', async () => {
    const response = await post({
      id: 'event_123',
      event: 'user.updated',
      data: {
        id: 'user_123',
        first_name: 'Ada',
        last_name: 'Lovelace',
        email: 'ada@example.test',
      },
      created_at: '2026-08-14T00:00:00Z',
    })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'workos_webhook_event',
        received: true,
        event: 'user.updated',
        applied: true,
      },
      error: null,
    })
    expect(syncUserFromWorkos).toHaveBeenCalledWith({
      workosUserId: 'user_123',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.test',
    })
  })

  it('acknowledges an unknown event without syncing a user', async () => {
    const response = await post({
      id: 'event_456',
      event: 'connection.activated',
      data: { id: 'connection_123' },
    })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'workos_webhook_event',
        received: true,
        event: 'connection.activated',
        applied: false,
      },
      error: null,
    })
    expect(syncUserFromWorkos).not.toHaveBeenCalled()
  })

  it('rejects an invalid signature before syncing a user', async () => {
    const response = await post(
      {
        id: 'event_789',
        event: 'user.updated',
        data: { id: 'user_123' },
      },
      false
    ).set('WorkOS-Signature', 't=1785000000, v1=wrong')

    expect(response.status).toBe(403)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'workos-webhook/invalid-signature',
        message: 'The request signature did not verify.',
      },
    })
    expect(syncUserFromWorkos).not.toHaveBeenCalled()
  })

  it('acknowledges a user.updated event for an unknown local user', async () => {
    syncUserFromWorkos.mockResolvedValue(false)

    const response = await post({
      id: 'event_987',
      event: 'user.updated',
      data: {
        id: 'user_unknown',
        first_name: 'Unknown',
        last_name: 'User',
        email: 'unknown@example.test',
      },
    })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'workos_webhook_event',
        received: true,
        event: 'user.updated',
        applied: false,
      },
      error: null,
    })
    expect(syncUserFromWorkos).toHaveBeenCalledWith({
      workosUserId: 'user_unknown',
      firstName: 'Unknown',
      lastName: 'User',
      email: 'unknown@example.test',
    })
  })
})
