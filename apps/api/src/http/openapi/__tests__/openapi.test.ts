import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createApp } from '@/app'

describe('GET /openapi.json', () => {
  it('serves a 3.1 document describing the service', async () => {
    const response = await request(createApp()).get('/openapi.json')

    expect(response.status).toBe(200)
    expect(response.body.openapi).toBe('3.1.0')
    expect(response.body.info.title).toBe('876 API')
  })

  it('is not wrapped in the envelope — it is a spec document, not an API resource', async () => {
    const response = await request(createApp()).get('/openapi.json')

    expect(response.body).not.toHaveProperty('data')
    expect(response.body.paths).toBeTypeOf('object')
  })

  it('documents every registered route, including the ones defined at import time', async () => {
    const response = await request(createApp()).get('/openapi.json')

    expect(response.body.paths['/health']).toBeDefined()
    expect(response.body.paths['/health'].get.tags).toEqual(['System'])
    expect(response.body.paths['/health'].get.summary).toBe('Check API health')
  })

  it('declares one security scheme per auth tier', async () => {
    const response = await request(createApp()).get('/openapi.json')

    // The tier split is the platform's central security rule: a publishable key
    // can never carry admin scope, so the schemes must stay distinct.
    expect(
      Object.keys(response.body.components.securitySchemes).sort()
    ).toEqual(['ApiKey', 'BearerToken', 'InternalKey'])
  })

  it('leaves a public route without a security requirement', async () => {
    const response = await request(createApp()).get('/openapi.json')

    expect(response.body.paths['/health'].get.security).toBeUndefined()
  })

  it('gives every operation a 422 response for validation failures', async () => {
    const response = await request(createApp()).get('/openapi.json')

    for (const [path, item] of Object.entries<
      Record<string, { responses?: object }>
    >(response.body.paths)) {
      for (const [method, operation] of Object.entries(item)) {
        expect(
          operation.responses,
          `${method.toUpperCase()} ${path}`
        ).toHaveProperty('422')
      }
    }
  })
})
