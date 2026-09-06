/**
 * Finance workspace members.
 *
 * A member row is an **explicit** grant. An organization member without one
 * still has access, derived from their 876 organization role — which is why
 * `MemberAccess` is resolved rather than read, and why the roster and the
 * resolved access are two different shapes.
 */

/** The lifecycle of an explicit workspace grant. */
export type MemberStatus = 'ACTIVE' | 'SUSPENDED'

/** The role summary carried alongside a member grant. */
export interface MemberRole {
  /** Unique identifier for the role. */
  id: string

  /** The stable identifier used to resolve system roles. */
  slug: string

  /** The role's display name. */
  name: string

  /** The finance permissions the role grants. */
  permissions: string[]
}

/** This object represents an explicit grant in a finance workspace. */
export interface Member {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'billing_member'

  /** Unique identifier for the object. */
  id: string

  /** The opaque 876 account this grant belongs to. */
  userId: string

  /** The role this member holds. */
  roleId: string

  /** Whether the grant is currently usable. */
  status: MemberStatus

  /** The role this member holds, resolved. */
  role: MemberRole
}

/**
 * One account's effective access to a finance workspace.
 *
 * Null when the account has neither an explicit grant nor an organization role
 * that maps onto a workspace role.
 */
export interface MemberAccess {
  /** The opaque 876 account the access belongs to. */
  userId: string

  /** Whether the access is currently usable. */
  status: MemberStatus

  /** The role the access resolves to. */
  role: MemberRole

  /** The finance permissions the account effectively holds. */
  permissions: string[]
}

/** Parameters for changing one member's workspace grant. */
export interface MemberUpdateParams {
  /** The workspace role to assign. */
  roleId: string

  /** Whether the grant stays usable. Defaults to `ACTIVE`. */
  status?: MemberStatus
}

/** A minimal member resource returned after a write. */
export interface MemberUpdated {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'billing_member'

  /** Unique identifier for the object. */
  id: string
}

/** Parameters for resolving one account's effective workspace access. */
export interface MemberAccessResolveParams {
  /** The finance workspace to resolve against. */
  tenantId: string

  /** The opaque 876 account to resolve. */
  userId: string

  /** The account's 876 organization role, used when no explicit grant exists. */
  organizationRole: 'super-admin' | 'admin' | 'staff'
}
