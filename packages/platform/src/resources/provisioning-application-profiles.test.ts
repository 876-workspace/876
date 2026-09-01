import { describe, expect, it, vi } from 'vitest'

import { create876AdminClient } from '../client'

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function client(fetchMock: ReturnType<typeof vi.fn>) {
  return create876AdminClient({
    baseUrl: 'https://api.test',
    internalKey: 'test-internal-key',
    fetch: fetchMock,
  })
}

describe('platform application provisioning profile resource', () => {
  it('uses encoded app/profile paths for list and retrieve', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }))
    const $876 = client(fetchMock)

    await $876.provisioning.applicationProfiles.list('876/crm')
    await $876.provisioning.applicationProfiles.retrieve(
      '876/crm',
      'jamaica/enterprise'
    )

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.test/provisioning/apps/876%2Fcrm/profiles',
      expect.objectContaining({ method: 'GET' })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.test/provisioning/apps/876%2Fcrm/profiles/jamaica%2Fenterprise',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('sends profile create, update, and routing policy bodies unchanged', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        object: 'application_provisioning_profile',
        id: 'apppr_1',
      })
    )
    const $876 = client(fetchMock)
    const createBody = {
      key: 'jamaica-enterprise',
      name: 'Jamaica Enterprise',
      description: 'Enterprise defaults for Jamaica',
      copy_from: 'default',
    }
    const updateBody = {
      name: 'Jamaica Enterprise v2',
      status: 'active' as const,
    }
    const policyBody = {
      conditions: [
        {
          group_key: 'jamaica-enterprise',
          field: 'setup' as const,
          operator: 'equals' as const,
          value: 'jamaica',
          priority: 100,
        },
        {
          group_key: 'jamaica-enterprise',
          field: 'plan' as const,
          operator: 'equals' as const,
          value: 'enterprise',
          priority: 100,
        },
      ],
    }

    await $876.provisioning.applicationProfiles.create('rap_crm', createBody)
    await $876.provisioning.applicationProfiles.update(
      'rap_crm',
      'jamaica-enterprise',
      updateBody
    )
    await $876.provisioning.applicationProfiles.replacePolicy(
      'rap_crm',
      'jamaica-enterprise',
      policyBody
    )

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.test/provisioning/apps/rap_crm/profiles',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(createBody),
      })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.test/provisioning/apps/rap_crm/profiles/jamaica-enterprise',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(updateBody),
      })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://api.test/provisioning/apps/rap_crm/profiles/jamaica-enterprise/policy',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(policyBody),
      })
    )
  })

  it('keeps manifest-v1 profile operations under the profile resource', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        object: 'provisioning_manifest_revision',
        id: 'pmr_1',
      })
    )
    const $876 = client(fetchMock)
    const draft = {
      manifest_version: 1 as const,
      reconciliation: 'create_missing' as const,
      preserve_tenant_overrides: true,
      finance_dependency: 'embedded' as const,
      finance_scopes: ['billing.customers.read'],
      resources: [],
      steps: [],
    }

    await $876.provisioning.applicationProfiles.retrieveManifest(
      'rap_crm',
      'jamaica'
    )
    await $876.provisioning.applicationProfiles.retrievePublished(
      'rap_crm',
      'jamaica'
    )
    await $876.provisioning.applicationProfiles.replaceDraft(
      'rap_crm',
      'jamaica',
      draft
    )
    await $876.provisioning.applicationProfiles.validate(
      'rap_crm',
      'jamaica',
      draft
    )
    await $876.provisioning.applicationProfiles.publish(
      'rap_crm',
      'jamaica'
    )

    const base =
      'https://api.test/provisioning/apps/rap_crm/profiles/jamaica'
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${base}/manifest`,
      expect.objectContaining({ method: 'GET' })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${base}/published`,
      expect.objectContaining({ method: 'GET' })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `${base}/draft`,
      expect.objectContaining({ method: 'PUT', body: JSON.stringify(draft) })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      `${base}/validate`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(draft) })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      `${base}/publish`,
      expect.objectContaining({ method: 'POST' })
    )
  })
})
