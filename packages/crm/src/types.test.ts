import { describe, expect, it } from 'vitest'

import { crmRequestNoteSchema, registryCustomerSchema } from './types'

function registryCustomer() {
  return {
    id: 'cus_1',
    customerType: 'CORE_ORGANIZATION',
    customerKind: 'BUSINESS',
    name: 'Northwind Traders',
    organizationId: 'org_1',
    userId: null,
  }
}

describe('registryCustomerSchema', () => {
  it('keeps the Billing primary contact fields', () => {
    const customer = {
      ...registryCustomer(),
      primaryContact: {
        object: 'contact',
        id: 'contact_1',
        userId: 'usr_1',
        firstName: 'Amina',
        lastName: 'Okafor',
        email: 'amina@example.com',
        workPhone: '+1 206 555 0100',
        mobilePhone: null,
        isPrimary: true,
      },
    }

    const result = registryCustomerSchema.safeParse(customer)

    expect(result).toEqual({ success: true, data: customer })
  })

  it('parses customers from older Billing deployments without a primary contact', () => {
    const customer = registryCustomer()

    const result = registryCustomerSchema.safeParse(customer)

    expect(result).toEqual({ success: true, data: customer })
  })
})

describe('crmRequestNoteSchema', () => {
  it('keeps serialized email metadata on email notes', () => {
    const note = {
      object: 'request_note',
      id: 'crm_note_1',
      tenantId: 'crm_tenant_1',
      requestId: 'crm_req_1',
      body: 'Your request has been received.',
      authorId: 'usr_1',
      internal: false,
      kind: 'EMAIL',
      emailMessageId: 'message_1',
      emailDirection: 'OUTBOUND',
      emailFrom: 'support@example.com',
      emailTo: ['amina@example.com'],
      emailCc: ['ops@example.com'],
      emailSubject: 'Re: Need help',
      editedAt: null,
      createdAt: 1,
      updatedAt: 1,
    }

    const result = crmRequestNoteSchema.safeParse(note)

    expect(result).toEqual({ success: true, data: note })
  })
})
