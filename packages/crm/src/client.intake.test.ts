import { describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import { create876CrmClient } from './client.js'

describe('create876CrmClient - intake surface', () => {
  it('exposes requestForms, requestFormSubmissions and requestFormRequests', () => {
    // ARRANGE
    const client = create876CrmClient({
      baseUrl: 'http://crm.test',
      internalKey: 'k',
      fetch: vi.fn() as unknown as typeof fetch,
    })
    // ACT & ASSERT - assert exact keys, not just toBeDefined
    expect(Object.keys(client)).toEqual(
      expect.arrayContaining([
        'requestForms',
        'requestFormSubmissions',
        'requestFormRequests',
      ])
    )
    expect(client.requestForms).toEqual(
      expect.objectContaining({
        list: expect.any(Function),
        retrieve: expect.any(Function),
        create: expect.any(Function),
        update: expect.any(Function),
        delete: expect.any(Function),
      })
    )
    expect(client.requestFormSubmissions).toEqual(
      expect.objectContaining({
        create: expect.any(Function),
        list: expect.any(Function),
      })
    )
    expect(client.requestFormRequests).toEqual(
      expect.objectContaining({ list: expect.any(Function) })
    )
  })

  it('keeps existing CRM surfaces intact alongside intake', () => {
    const client = create876CrmClient({
      baseUrl: 'http://crm.test',
      internalKey: 'k',
      fetch: vi.fn() as unknown as typeof fetch,
    })
    expect(client.requests).toBeDefined()
    expect(client.customers).toBeDefined()
    expect(client.teams).toBeDefined()
    expect(client.requestCategories).toBeDefined()
    expect(client.requestNotes).toBeDefined()
  })

  it('creates independent client instances', () => {
    const a = create876CrmClient({
      baseUrl: 'http://crm.test',
      internalKey: 'k',
    })
    const b = create876CrmClient({
      baseUrl: 'http://crm.test',
      internalKey: 'k2',
    })
    expect(a).not.toBe(b)
    expect(a.requestForms).not.toBe(b.requestForms)
  })
})
