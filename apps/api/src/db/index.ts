/**
 * The database layer's public surface.
 *
 * Model types and the `Prisma` namespace (input types, filter shapes, enums)
 * are re-exported here so nothing outside `src/db/` imports the generated client
 * directly — the generated directory is regenerated wholesale and its internal
 * paths are not a contract. dependency-cruiser enforces this.
 *
 * The client itself is deliberately *not* re-exported: only a `*.repository.ts`
 * may import `@/db/client`, and routing it through this barrel would make that
 * rule unenforceable.
 */
export { Prisma } from './generated/prisma/client'
export type {
  Account,
  Address,
  ApiKey,
  App,
  AppAssignment,
  ApplicationModule,
  AuditEvent,
  AuthAttempt,
  AuthProvider,
  Country,
  Currency,
  Feature,
  Membership,
  Organization,
  OrganizationRole,
  Region,
  Session,
  Subscription,
  User,
  UserAppEnrollment,
  UserDevice,
  UserEmail,
  UserFeature,
  UserIdentification,
  UserMobileNumber,
  UserPin,
  UserProfile,
  UserSocialProfile,
  Verification,
} from './generated/prisma/client'
