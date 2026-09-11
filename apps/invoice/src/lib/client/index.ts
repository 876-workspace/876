import { customers } from './customers'
import { items } from './items'
import { documents } from './documents'
import { appMemberships } from './app-memberships'
import { onboarding } from './onboarding'
import { roles } from './roles'
import { members } from './members'
import { invites } from './invites'
import { support } from './support'
import { paymentModes } from './payment-modes'
import { payments } from './payments'
import { refunds } from './refunds'
import { salesReceipts } from './sales-receipts'
import { currencies } from './currencies'
import { taxAuthorities, taxRates } from './taxes'

export const client = {
  onboarding,
  roles,
  members,
  invites,
  customers,
  items,
  documents,
  appMemberships,
  support,
  paymentModes,
  payments,
  refunds,
  salesReceipts,
  currencies,
  taxAuthorities,
  taxRates,
}

export { customers } from './customers'
export { items } from './items'
export { documents } from './documents'
export type { DocumentUpdateParams } from './documents'
export { appMemberships } from './app-memberships'
export { onboarding } from './onboarding'
export { roles } from './roles'
export { members } from './members'
export { invites } from './invites'
export { support } from './support'
export { payments } from './payments'
export { refunds } from './refunds'
export { salesReceipts } from './sales-receipts'
export { currencies } from './currencies'
export type { ClientResult } from '@/types/api'
