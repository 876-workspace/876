import { appMemberships } from './app-memberships'
import { customers } from './customers'
import { onboarding } from './onboarding'
import { requestCategories } from './request-categories'
import { requestEvents } from './request-events'
import { requestPriorities } from './request-priorities'
import { requestReminders } from './request-reminders'
import { requestTasks } from './request-tasks'
import { requests, requestNotes } from './requests'
import { support } from './support'
import { teams } from './teams'

export const client = {
  appMemberships,
  customers,
  onboarding,
  requests,
  requestNotes,
  requestTasks,
  requestReminders,
  requestEvents,
  teams,
  requestCategories,
  requestPriorities,
  support,
}
export { customers } from './customers'
export { appMemberships } from './app-memberships'
export { onboarding } from './onboarding'
export { requestCategories } from './request-categories'
export { requestEvents } from './request-events'
export { requestPriorities } from './request-priorities'
export { requestReminders } from './request-reminders'
export { requestTasks } from './request-tasks'
export { requests, requestNotes } from './requests'
export { support } from './support'
export { teams } from './teams'
export type { ClientResult } from './request'
