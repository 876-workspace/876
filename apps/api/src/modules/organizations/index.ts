export { registerOrganizationRoutes } from './organizations.routes'
export { registerOrgStructureRoutes } from './structure.routes'
export { registerOrgAccessRoutes } from './access.routes'

export {
  getOrgAppEntitlement,
  listOrgAppEntitlements,
  requireOrgAppAccessPermission,
  requireOrgAppAccessRead,
  type OrgAccessPrincipal,
} from './app-access-policy.service'

export {
  subscriptionItemSchema,
  subscriptionSchema,
  type Subscription,
} from './organizations.schemas'
export {
  serializeSubscription,
  type SubscriptionRow,
} from './organizations.serializers'

export {
  syncOrganizationFromWorkos,
  findLocalOrgIdByWorkosId,
} from './organizations.service'

// Invite and organization-role reads consumed by the app-access module.
export {
  findInviteAccessSelectionById,
  findInviteAccessSelectionByToken,
  findOrgRoleForInvite,
  updateInviteAccessSelection,
  type InviteAppAccessSelectionRow,
} from './invite-app-access-lookup.service'

// Additive invite role-selection request body, used by the invite create/update
// wiring described in `docs/architecture/012-app-access-wiring-contract.md`.
export {
  inviteAppAccessSelectionBodySchema,
  type InviteAppAccessSelectionBody,
} from './invite-app-access.schemas'
