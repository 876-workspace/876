import { describe, expect, it } from 'vitest'

import {
  toCreateWorkTaskLinkInput,
  toWorkContext,
  workResourceRefSchema,
} from './resource-ref'
import { createWorkTaskInputSchema } from './types'

describe('workResourceRefSchema', () => {
  it('parses an opaque resource reference with safe display metadata', () => {
    const result = workResourceRefSchema.safeParse({
      service: 'billing',
      resource: 'invoice',
      externalId: 'inv_123',
      label: 'INV-123',
      url: '/invoices/inv_123',
    })

    expect(result).toEqual({
      success: true,
      data: {
        service: 'billing',
        resource: 'invoice',
        externalId: 'inv_123',
        label: 'INV-123',
        url: '/invoices/inv_123',
      },
    })
  })

  it('rejects a reference without the opaque external id', () => {
    const result = workResourceRefSchema.safeParse({
      service: 'crm',
      resource: 'request',
    })

    expect(result.success).toBe(false)
  })

  it('rejects unknown authority-shaped fields', () => {
    const result = workResourceRefSchema.safeParse({
      service: 'crm',
      resource: 'request',
      externalId: 'req_123',
      organizationId: 'org_other',
    })

    expect(result.success).toBe(false)
  })

  it.each(['javascript:alert(1)', '//evil.example/path', 'data:text/plain,x'])(
    'rejects unsafe display URL %s',
    (url) => {
      const result = workResourceRefSchema.safeParse({
        service: 'crm',
        resource: 'request',
        externalId: 'req_123',
        url,
      })

      expect(result.success).toBe(false)
    }
  )
})

describe('toWorkContext', () => {
  it('maps externalId to the legacy Work context id', () => {
    const result = toWorkContext({
      service: 'billing',
      resource: 'invoice',
      externalId: 'inv_123',
      label: 'INV-123',
    })

    expect(result).toEqual({
      service: 'billing',
      resource: 'invoice',
      id: 'inv_123',
    })
  })
})

describe('toCreateWorkTaskLinkInput', () => {
  it('preserves safe display metadata on the canonical task link', () => {
    const result = toCreateWorkTaskLinkInput({
      service: 'crm',
      resource: 'request',
      externalId: 'req_123',
      label: 'Request #1234',
      url: '/requests/req_123',
    })

    expect(result).toEqual({
      service: 'crm',
      resource: 'request',
      externalId: 'req_123',
      label: 'Request #1234',
      url: '/requests/req_123',
      isPrimary: true,
    })
  })

  it('can create a non-primary link without optional metadata', () => {
    const result = toCreateWorkTaskLinkInput(
      {
        service: 'billing',
        resource: 'customer',
        externalId: 'cus_123',
      },
      false
    )

    expect(result).toEqual({
      service: 'billing',
      resource: 'customer',
      externalId: 'cus_123',
      isPrimary: false,
    })
  })
})

describe('createWorkTaskInputSchema primary links', () => {
  const context = {
    service: 'billing',
    resource: 'invoice',
    id: 'inv_123',
  }

  it('accepts a metadata-rich primary link for the same resource', () => {
    const result = createWorkTaskInputSchema.safeParse({
      context,
      primaryLink: {
        service: 'billing',
        resource: 'invoice',
        externalId: 'inv_123',
        label: 'INV-123',
        url: '/invoices/inv_123',
        isPrimary: true,
      },
      title: 'Review invoice',
      createdBy: 'user_1',
    })

    expect(result.success).toBe(true)
  })

  it('rejects a primary link for a different resource', () => {
    const result = createWorkTaskInputSchema.safeParse({
      context,
      primaryLink: {
        service: 'billing',
        resource: 'invoice',
        externalId: 'inv_other',
        isPrimary: true,
      },
      title: 'Review invoice',
      createdBy: 'user_1',
    })

    expect(result.success).toBe(false)
  })
})
