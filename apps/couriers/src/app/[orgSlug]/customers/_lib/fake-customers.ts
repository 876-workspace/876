import type { CustomerTableRow } from '../_components/customers-table'

/** Frontend-only preview data for workspaces that do not have customers yet. */
export const FAKE_CUSTOMERS: CustomerTableRow[] = [
  {
    id: 'fake-customer-1',
    billingCustomerId: 'fake-billing-customer-1',
    customerName: 'Nia Campbell',
    companyName: 'Blue Mountain Trading',
    email: 'nia.campbell@example.test',
    phone: '+1 876 555 0101',
    mailboxNumber: '1001',
  },
  {
    id: 'fake-customer-2',
    billingCustomerId: 'fake-billing-customer-2',
    customerName: 'Andre Williams',
    companyName: null,
    email: 'andre.williams@example.test',
    phone: '+1 876 555 0102',
    mailboxNumber: '1002',
  },
  {
    id: 'fake-customer-3',
    billingCustomerId: 'fake-billing-customer-3',
    customerName: 'Sophia Brown',
    companyName: null,
    email: 'sophia.brown@example.test',
    phone: '+1 876 555 0103',
    mailboxNumber: '1003',
  },
  {
    id: 'fake-customer-4',
    billingCustomerId: 'fake-billing-customer-4',
    customerName: 'Marcus Thompson',
    companyName: 'Harbour View Imports',
    email: 'marcus.thompson@example.test',
    phone: '+1 876 555 0104',
    mailboxNumber: '1004',
  },
  {
    id: 'fake-customer-5',
    billingCustomerId: 'fake-billing-customer-5',
    customerName: 'Aaliyah Grant',
    companyName: null,
    email: 'aaliyah.grant@example.test',
    phone: '+1 876 555 0105',
    mailboxNumber: '1005',
  },
]
