import { describe, expect, it, vi } from 'vitest'

import { create876AdminClient } from '../client'

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

describe('admin provisioning resource', () => {
  it('uses encoded target and note identifiers for provisioning requests', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ object: 'provisioning_note', id: 'note/1' })
      )
    const $876 = create876AdminClient({
      baseUrl: 'https://api.test',
      internalKey: 'test-internal-key',
      fetch: fetchMock,
    })

    await $876.provisioning.notes.delete('application', 'app/one', 'note/1')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/provisioning/manifests/application/app%2Fone/notes/note%2F1',
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('sends typed relational drafts without a JSON manifest blob', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        object: 'provisioning_manifest_revision',
        id: 'pmr_test',
      })
    )
    const $876 = create876AdminClient({
      baseUrl: 'https://api.test',
      internalKey: 'test-internal-key',
      fetch: fetchMock,
    })
    const body = {
      manifest_version: 1 as const,
      reconciliation: 'create_missing' as const,
      preserve_tenant_overrides: true as const,
      finance_dependency: 'embedded' as const,
      finance_scopes: ['billing.customers.read'],
      resources: [
        {
          resource_type: 'workspace',
          key: 'default',
          position: 0,
          properties: [
            {
              key: 'currency',
              value_type: 'reference' as const,
              reference_namespace: 'currency',
              reference_key: 'JMD',
            },
          ],
        },
      ],
      steps: [],
    }

    await $876.provisioning.replaceDraft('application', 'rap_test', body)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/provisioning/manifests/application/rap_test/draft',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify(body) })
    )
  })

  it('supports filtered run history, reconciliation, and encoded retries', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ object: 'provisioning_run', id: 'run/1' })
      )
    const $876 = create876AdminClient({
      baseUrl: 'https://api.test',
      internalKey: 'test-internal-key',
      fetch: fetchMock,
    })

    await $876.provisioning.runs.list({
      organization_id: 'org_1',
      status: 'failed',
    })
    await $876.provisioning.runs.retry('run/1')
    await $876.provisioning.runs.reconcile({ app_id: '876-couriers' })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.test/provisioning/runs?organization_id=org_1&status=failed',
      expect.objectContaining({ method: 'GET' })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.test/provisioning/runs/run%2F1/retry',
      expect.objectContaining({ method: 'POST' })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://api.test/provisioning/runs/reconcile',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ app_id: '876-couriers' }),
      })
    )
  })
})
