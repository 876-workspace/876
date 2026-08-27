export { registerAppAccessRoutes } from './app-access.routes'
export {
  findOrgAppRoleForAccess,
  listAppPermissionKeysForProvisioning,
} from './app-access-lookup.service'
export { ensureAppMembershipForProvisioning } from './app-access-provisioning.service'
export {
  isEntitled,
  materializeRoleTemplatesForApp,
  resolveEffectiveAppPermissions,
} from './app-access.service'
export type {
  AppMembership,
  AppPermission,
  AppRole,
} from './app-access.schemas'

// Invite app-access primitives. Exported here so the invite create/accept
// wiring in `docs/architecture/012-app-access-wiring-contract.md` consumes them
// through this module's public interface rather than reaching into its files.
export {
  applyInviteAppAccess,
  resolveInviteAppAccessSelection,
  setInviteAppAccessSelection,
  validateInviteAppAccessSelection,
  type ValidatedInviteAppAccessSelection,
} from './invite-app-access.service'
