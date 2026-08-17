import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { create876ServerClient } from './server'

const API_KEY = '876_app_secret_test1234567890123456'

describe('invoice items surface', () => {
  it('exposes Billing items instead of the subscription product catalog', () => {
    const $876 = create876ServerClient({
      app: 'invoice',
      apiKey: API_KEY,
      services: {
        billing: {
          tenant: { baseUrl: 'https://billing.example.test' },
        },
      },
    })

    expect($876.items.list).toBeTypeOf('function')
    expect($876.items.retrieve).toBeTypeOf('function')
    expect($876.items.create).toBeTypeOf('function')
    expect($876.items.update).toBeTypeOf('function')
    expect($876.items.delete).toBeTypeOf('function')
    expect('products' in $876).toBe(false)
  })
})
