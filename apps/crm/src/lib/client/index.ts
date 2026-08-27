import { customers } from './customers'
import { onboarding } from './onboarding'
import { requestCategories } from './request-categories'
import { requestReminders } from './request-reminders'
import { requestTasks } from './request-tasks'
import { requests, requestNotes } from './requests'
import { teams } from './teams'

export const client = {
  onboarding,
  customers,
  requests,
  requestNotes,
  requestTasks,
  requestReminders,
  teams,
  requestCategories,
}
export { customers } from './customers'
export { onboarding } from './onboarding'
export { requestCategories } from './request-categories'
export { requestReminders } from './request-reminders'
export { requestTasks } from './request-tasks'
export { requests, requestNotes } from './requests'
export { teams } from './teams'
export type { ClientResult } from './request'
