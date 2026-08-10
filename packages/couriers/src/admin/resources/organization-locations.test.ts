import { describe, expect, it } from 'vitest'

import { create876CouriersAdminClient } from '../client'

describe('create876CouriersAdminClient', () => {
  it('does not expose organizationLocations as a public resource', () => {
    const client = create876CouriersAdminClient({
      baseUrl: 'https://couriers.876.local',
      apiKey: '876_app_secret',
      internalKey: 'internal',
    })
    expect('organizationLocations' in client).toBe(false)
  })
})
