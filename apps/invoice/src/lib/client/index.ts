import { customers } from './customers'
import { items } from './items'
import { documents } from './documents'
import { appMemberships } from './app-memberships'
import { onboarding } from './onboarding'

export const client = {
  onboarding,
  customers,
  items,
  documents,
  appMemberships,
}

export { customers } from './customers'
export { items } from './items'
export { documents } from './documents'
export { appMemberships } from './app-memberships'
export { onboarding } from './onboarding'
export type { ClientResult } from '@/types/api'
