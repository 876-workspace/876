import type { DocumentTemplateType } from '@876/core/document-templates'
import { DOCUMENT_TITLES } from '@876/core/document-templates'

import type { TemplatedDocumentData } from './types'

const SELLER: TemplatedDocumentData['seller'] = {
  name: 'Island Fresh Foods Ltd.',
  logoUrl: null,
  email: 'billing@islandfresh.test',
  phone: '+1 876-555-0100',
  website: 'islandfresh.test',
  taxId: 'TRN 123-456-789',
  address: {
    line1: '14 Harbour Street',
    line2: null,
    city: 'Kingston',
    state: null,
    postalCode: 'JMKN01',
    country: 'Jamaica',
  },
}

const RECIPIENT: TemplatedDocumentData['recipient'] = {
  name: 'Seaside Hotel & Spa',
  email: 'accounts@seasidehotel.test',
  phone: '+1 876-555-0142',
  billingAddress: {
    line1: '1 Ocean Boulevard',
    line2: null,
    city: 'Montego Bay',
    state: 'St. James',
    postalCode: null,
    country: 'Jamaica',
  },
  shippingAddress: {
    line1: '1 Ocean Boulevard',
    line2: 'Receiving Dock',
    city: 'Montego Bay',
    state: 'St. James',
    postalCode: null,
    country: 'Jamaica',
  },
}

/**
 * Realistic Jamaican sample data for editor previews and gallery thumbnails.
 * Money is display strings only, never numbers.
 */
export function sampleDocumentFor(
  documentType: DocumentTemplateType,
  seller?: TemplatedDocumentData['seller']
): TemplatedDocumentData {
  const title = DOCUMENT_TITLES[documentType]
  const prefix =
    documentType === 'invoice'
      ? 'INV'
      : documentType === 'quote'
        ? 'QT'
        : documentType === 'sales-receipt'
          ? 'SR'
          : documentType === 'credit-note'
            ? 'CN'
            : 'PR'
  return {
    seller: seller ?? SELLER,
    recipient: RECIPIENT,
    details: {
      number: `${prefix}-2026-001`,
      date: 'Sep 15, 2026',
      'due-date': 'Oct 15, 2026',
      'expiry-date': 'Oct 15, 2026',
      terms: 'Net 30',
      reference: 'PO-7841',
      salesperson: 'Marcus Garvey',
      subject: `Weekly produce supply — ${title}`,
      'payment-mode': 'Bank transfer',
    },
    lines: [
      {
        id: 'line_1',
        name: 'Ackee (canned, case of 24)',
        description: 'Grade A, 540g tins',
        quantity: '10',
        unit: 'case',
        rate: 'JMD 8,500.00',
        discount: 'JMD 2,500.00',
        tax: 'JMD 12,000.00',
        amount: 'JMD 94,500.00',
      },
      {
        id: 'line_2',
        name: 'Blue Mountain coffee beans',
        description: 'Roasted, 1kg bags',
        quantity: '25',
        unit: 'bag',
        rate: 'JMD 6,200.00',
        discount: null,
        tax: 'JMD 23,250.00',
        amount: 'JMD 178,250.00',
      },
    ],
    totals: {
      subtotal: 'JMD 240,000.00',
      discount: 'JMD 2,500.00',
      shipping: 'JMD 5,000.00',
      adjustment: null,
      tax: 'JMD 35,250.00',
      total: 'JMD 277,750.00',
      amountPaid: 'JMD 100,000.00',
      amountCredited: null,
      balanceDue: 'JMD 177,750.00',
      amountInWords:
        'Two hundred and seventy-seven thousand seven hundred and fifty dollars',
    },
    taxSummary: [{ label: 'GCT 15%', rate: '15%', amount: 'JMD 35,250.00' }],
    notes: 'Deliveries every Tuesday before 9 a.m.',
    terms:
      'Payment due within 30 days. Overdue balances attract 2% monthly interest.',
    paymentOptions: ['Bank transfer', 'Cheque', 'Cash on delivery'],
    bankDetails: [
      { label: 'Bank', value: 'National Commercial Bank' },
      { label: 'Account', value: '123-456-789' },
    ],
    qrCodeUrl: null,
  }
}
