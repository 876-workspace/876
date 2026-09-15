import { resolveDocumentTemplate } from '@876/core/document-templates'
import { describe, expect, it, vi } from 'vitest'

import { create876Client } from '../client'
import { create876BillingIntegrationClient } from '../integration/client'

const baseUrl = 'https://billing.example.test'
const settings = resolveDocumentTemplate('standard', 'invoice', {})
const template = {
  object: 'document-template' as const,
  id: 'dtpl_1',
  documentType: 'invoice' as const,
  name: 'Invoice',
  layout: 'standard' as const,
  isDefault: true,
  settings: {},
  resolvedSettings: settings,
  createdAt: 1,
  updatedAt: 1,
}
const list = {
  object: 'list' as const,
  data: [template],
  has_more: false,
  total_count: 1,
  url: '/api/v1/document-templates',
}
const resolved = {
  object: 'resolved-document-template' as const,
  documentType: 'invoice' as const,
  templateId: 'dtpl_1',
  name: 'Invoice',
  layout: 'standard' as const,
  settings,
  branding: {
    accentColor: '#2563eb',
    appearance: 'system' as const,
    sidebarTone: 'light' as const,
  },
}
const branding = {
  object: 'branding' as const,
  accentColor: '#2563eb',
  appearance: 'system' as const,
  sidebarTone: 'light' as const,
  updatedAt: null,
}

function clientFor(payload: unknown) {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(Response.json(payload))
  return { client: create876Client({ baseUrl, fetch }), fetch }
}

describe('document templates and branding resources', () => {
  it('lists tenant templates with its document type query', async () => {
    const { client, fetch } = clientFor({ data: list, error: null })
    await expect(
      client.documentTemplates.list({ documentType: 'invoice' })
    ).resolves.toEqual({ data: list, error: null })
    expect(fetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/document-templates?documentType=invoice`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('creates a tenant template with the exact body', async () => {
    const { client, fetch } = clientFor({ data: template, error: null })
    await client.documentTemplates.create({
      documentType: 'invoice',
      name: 'Invoice',
      layout: 'standard',
      isDefault: true,
    })
    expect(fetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/document-templates`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          documentType: 'invoice',
          name: 'Invoice',
          layout: 'standard',
          isDefault: true,
        }),
      })
    )
  })

  it('retrieves an encoded tenant template id', async () => {
    const { client, fetch } = clientFor({ data: template, error: null })
    await client.documentTemplates.retrieve('dtpl/a')
    expect(fetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/document-templates/dtpl%2Fa`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('patches tenant template settings', async () => {
    const { client, fetch } = clientFor({ data: template, error: null })
    await client.documentTemplates.update('dtpl_1', { name: 'Updated' })
    expect(fetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/document-templates/dtpl_1`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated' }),
      })
    )
  })

  it('deletes a tenant template', async () => {
    const { client, fetch } = clientFor({
      data: { object: 'document-template', id: 'dtpl_1', deleted: true },
      error: null,
    })
    await client.documentTemplates.delete('dtpl_1')
    expect(fetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/document-templates/dtpl_1`,
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('sets the default template through its action path', async () => {
    const { client, fetch } = clientFor({ data: template, error: null })
    await client.documentTemplates.setDefault('dtpl_1')
    expect(fetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/document-templates/dtpl_1/set-default`,
      expect.objectContaining({ method: 'POST', body: '{}' })
    )
  })

  it('resolves the requested template id before defaults', async () => {
    const { client, fetch } = clientFor({ data: resolved, error: null })
    await client.documentTemplates.resolve('invoice', 'dtpl_1')
    expect(fetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/document-templates/resolved?documentType=invoice&templateId=dtpl_1`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('retrieves tenant branding', async () => {
    const { client, fetch } = clientFor({ data: branding, error: null })
    await client.branding.retrieve()
    expect(fetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/branding`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('patches tenant branding', async () => {
    const { client, fetch } = clientFor({ data: branding, error: null })
    await client.branding.update({ appearance: 'dark' })
    expect(fetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/branding`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ appearance: 'dark' }),
      })
    )
  })

  it('uses organization-scoped integration paths', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json({ data: list, error: null }))
    const client = create876BillingIntegrationClient({
      baseUrl,
      apiKey: '876_app_secret_invoice',
      fetch,
    })
    await client.documentTemplates.list('org/a', { documentType: 'invoice' })
    expect(fetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/integrations/organizations/org%2Fa/document-templates?documentType=invoice`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('updates organization branding', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json({ data: branding, error: null }))
    const client = create876BillingIntegrationClient({
      baseUrl,
      apiKey: '876_app_secret_invoice',
      fetch,
    })
    await client.branding.update('org_1', { sidebarTone: 'dark' })
    expect(fetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/integrations/organizations/org_1/branding`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ sidebarTone: 'dark' }),
      })
    )
  })

  it('rejects a malformed document-template response', async () => {
    const { client } = clientFor({ data: { object: 'wrong' }, error: null })
    await expect(
      client.documentTemplates.retrieve('dtpl_1')
    ).resolves.toMatchObject({
      data: null,
      error: { code: 'billing/invalid-response' },
    })
  })
})
