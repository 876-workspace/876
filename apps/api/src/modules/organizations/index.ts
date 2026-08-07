export { registerOrganizationRoutes } from './organizations.routes'
export { registerOrgStructureRoutes } from './structure.routes'
export { registerOrgAccessRoutes } from './access.routes'

// The subscription contract is owned here and consumed by `billing`, mirroring
// `domains/billing/router.py`, which imports it from the organizations domain
// rather than declaring its own.
export {
  subscriptionItemSchema,
  subscriptionSchema,
  type Subscription,
} from './organizations.schemas'
export {
  serializeSubscription,
  type SubscriptionRow,
} from './organizations.serializers'
