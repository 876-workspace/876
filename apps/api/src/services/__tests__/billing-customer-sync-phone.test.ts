import { describe, expect, it } from 'vitest'

import {
  CUSTOMER_EVENT_TYPE,
  customerEventPayload,
  type BillingCustomerOutboxRow,
} from '../billing-customer-sync'

describe('Billing customer sync contact contract', () => {
  it('emits the primary contact phone expected by Billing customer.ensure', () => {
    const event: BillingCustomerOutboxRow = {
      id: 'bce_phone',
      eventType: CUSTOMER_EVENT_TYPE,
      subjectType: 'organization',
      subjectId: 'org_test',
      name: 'Test Org',
      email: 'billing@test.example',
      customerKind: 'BUSINESS',
      companyName: 'Test Org',
      firstName: 'Test',
      lastName: 'Owner',
      phone: '+18765550000',
      contactUserId: 'user_owner',
      contactFirstName: 'Test',
      contactLastName: 'Owner',
      contactEmail: 'owner@test.example',
      contactPhone: '+18765550123',
      contactAvatar: null,
      payloadHash: 'hash',
      occurredAt: 1_787_050_000n,
      status: 'pending',
      customerStatus: 'ACTIVE',
      attemptCount: 0,
      availableAt: 1_787_050_000n,
      lockedAt: null,
      deliveredAt: null,
      lastError: null,
      createdAt: 1_787_050_000n,
      updatedAt: 1_787_050_000n,
    }

    expect(customerEventPayload(event)).toMatchObject({
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_test',
      phone: '+18765550000',
      primaryContact: {
        userId: 'user_owner',
        email: 'owner@test.example',
        phone: '+18765550123',
      },
    })
  })
})
