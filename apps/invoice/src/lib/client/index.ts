import { customers } from './customers'
import { items } from './items'
import { documents } from './documents'
import { appMemberships } from './app-memberships'
import { onboarding } from './onboarding'
import { roles } from './roles'
import { members } from './members'
import { invites } from './invites'

export const client = {
  onboarding,
  roles,
  members,
  invites,
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
export { roles } from './roles'
export { members } from './members'
export { invites } from './invites'
export type { ClientResult } from '@/types/api'
