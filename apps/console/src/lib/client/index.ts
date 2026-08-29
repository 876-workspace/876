import { apiKeys } from './api-keys'
import { appMemberships } from './app-memberships'
import { apps } from './apps'
import { billing } from './billing'
import { billingIntegrations } from './billing-integrations'
import { devices } from './devices'
import { features } from './features'
import {
  appAssignments,
  invites,
  members,
  organizations,
  subscriptions,
} from './orgs'
import { onboarding } from './onboarding'
import { modules } from './modules'
import { prices } from './prices'
import { products } from './products'
import { provisioning } from './provisioning'
import { provisioningSetups } from './provisioning-setups'
import { provisioningRuns } from './provisioning-runs'
import {
  requestNotes,
  requestReminders,
  requests,
  requestTasks,
} from './requests'
import { reservedUsernames } from './reserved-usernames'
import { roles } from './roles'
import { pin } from './pin'
import { sessions } from './sessions'
import { team } from './team'
import { users } from './users'
import { widgets } from './widgets'

export const client = {
  apiKeys,
  appMemberships,
  apps,
  billing,
  billingIntegrations,
  devices,
  features,
  organizations,
  members,
  appAssignments,
  invites,
  subscriptions,
  onboarding,
  modules,
  prices,
  products,
  provisioning,
  provisioningSetups,
  provisioningRuns,
  requests,
  requestTasks,
  requestReminders,
  requestNotes,
  reservedUsernames,
  roles,
  pin,
  sessions,
  team,
  users,
  widgets,
}

export { apiKeys } from './api-keys'
export { appMemberships } from './app-memberships'
export { apps } from './apps'
export { billing } from './billing'
export { billingIntegrations } from './billing-integrations'
export { features } from './features'
export {
  appAssignments,
  invites,
  members,
  organizations,
  subscriptions,
} from './orgs'
export { onboarding } from './onboarding'
export { modules } from './modules'
export { prices } from './prices'
export { products } from './products'
export { provisioning } from './provisioning'
export { provisioningSetups } from './provisioning-setups'
export { provisioningRuns } from './provisioning-runs'
export {
  requestNotes,
  requestReminders,
  requests,
  requestTasks,
} from './requests'
export { reservedUsernames } from './reserved-usernames'
export { pin } from './pin'
export { roles } from './roles'
export { team } from './team'
export { users } from './users'
export { widgets } from './widgets'
export type { ClientResult } from '@/types/api'
