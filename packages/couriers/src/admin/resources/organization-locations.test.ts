import { describe, expect, it } from 'vitest'

import { createOrganizationLocationsResource } from './organization-locations'
import { buildAdminRuntime } from '../runtime'

describe('createOrganizationLocationsResource', () => {
  it('exposes no public sync/reconcile verbs', () => {
    const resource = createOrganizationLocationsResource(
      buildAdminRuntime({ baseUrl: 'https://couriers.876.local', apiKey: 'k', internalKey: 'i' })
    )
    expect('sync' in resource).toBe(false)
    expect('reconcile' in resource).toBe(false)
  })
})
