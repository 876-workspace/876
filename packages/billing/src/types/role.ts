/**
 * Finance workspace roles.
 *
 * 876 Billing and 876 Invoice share one finance workspace per organization, so
 * they share these roles. The permission keys are the finance plane's colon
 * keys, owned by `@876/core/access/finance-catalog` — not the app-access keys
 * that decide who may open a product.
 */

/**
 * This object represents a role in an organization's finance workspace.
 */
export interface Role {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'billing_role'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * The stable identifier used to resolve system roles, for example `staff`.
   */
  slug: string

  /**
   * The role's display name.
   */
  name: string

  /**
   * A short description of what the role is for. Empty when none was given.
   */
  description: string

  /**
   * The finance permissions this role grants.
   */
  permissions: string[]

  /**
   * Whether 876 ships this role. System roles cannot be edited or deleted.
   */
  isSystem: boolean

  /**
   * Whether new members receive this role by default.
   */
  isDefault: boolean

  /**
   * How many workspace members currently hold this role.
   */
  memberCount: number

  /**
   * Time at which the object was created. Measured in seconds since the Unix epoch.
   */
  createdAt: number

  /**
   * Time at which the object was last updated. Measured in seconds since the Unix epoch.
   */
  updatedAt: number
}

/**
 * A minimal role resource returned after a write.
 */
export interface RoleCreated {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'billing_role'

  /**
   * Unique identifier for the object.
   */
  id: string
}

/**
 * A deleted role tombstone.
 */
export interface RoleDeleted extends RoleCreated {
  /**
   * Always true for a deleted object.
   */
  deleted: true
}

/**
 * Parameters for creating a custom finance role.
 */
export interface RoleCreateParams {
  /**
   * The stable identifier for the role. Lowercase letters, digits, and underscores.
   */
  slug: string

  /**
   * The role's display name.
   */
  name: string

  /**
   * A short description of what the role is for.
   */
  description?: string

  /**
   * The finance permissions to grant. Must include `billing:access`, and every
   * `:write` permission must be accompanied by its matching `:read`.
   */
  permissions: string[]
}

/**
 * Parameters for updating a custom finance role.
 */
export interface RoleUpdateParams {
  /**
   * The role's display name.
   */
  name?: string

  /**
   * A short description of what the role is for. Pass null to clear it.
   */
  description?: string | null

  /**
   * The complete set of finance permissions the role should grant.
   */
  permissions?: string[]
}
