import { describe, expect, it, vi } from 'vitest'

import { create876AdminClient } from '../client'

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

describe('admin onboarding resource', () => {
  it('scopes saved answers to an organization and target', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ object: 'onboarding_session', id: 'obs_test' })
      )
    const $876 = create876AdminClient({
      baseUrl: 'https://api.test',
      internalKey: 'test-internal-key',
      fetch: fetchMock,
    })
    const body = {
      country_code: 'JM',
      answers: { legal_name: 'Example Limited', locations: [] },
    }

    await $876.onboarding.replaceAnswers(
      'org/one',
      'organization',
      'global',
      body
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/onboarding/organizations/org%2Fone/organization/global',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify(body) })
    )
  })

  it('requests the country-aware catalog explicitly', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ object: 'onboarding_catalog', schema_version: 1 })
      )
    const $876 = create876AdminClient({
      baseUrl: 'https://api.test',
      internalKey: 'test-internal-key',
      fetch: fetchMock,
    })

    await $876.onboarding.retrieveCatalog('organization', 'global', 'JM')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/onboarding/catalog/organization/global?country_code=JM',
      expect.objectContaining({ method: 'GET' })
    )
  })
})
