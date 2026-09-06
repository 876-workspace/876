import {
  mergeFinancePermissions,
  partitionFinancePermissions,
  withImpliedFinancePermissions,
  withoutFinancePermission,
} from '@876/core/access/finance-catalog'

import type {
  FinancePermissionKey,
  FinancePermissionSurface,
  FinanceRoleSummary,
} from './types'

/**
 * Component-facing adapters over the finance permission rules.
 *
 * The rules themselves live in `@876/core/access/finance-catalog`, because the
 * route handlers that write a role need the same partition/merge and cannot
 * import a React package. These wrappers exist only to give a checkbox handler
 * the shape it actually wants.
 */

/** Separates grants the host can edit from grants it must preserve. */
export function partitionPermissions(
  role: Pick<FinanceRoleSummary, 'permissions'>,
  surface: FinancePermissionSurface
): { editable: FinancePermissionKey[]; external: FinancePermissionKey[] } {
  return partitionFinancePermissions(role.permissions, surface)
}

/**
 * Produces the complete stored grant list. External permissions are retained so
 * a reduced product surface cannot silently remove grants from a shared role.
 */
export function mergePermissions(
  nextEditable: readonly FinancePermissionKey[],
  external: readonly FinancePermissionKey[]
): FinancePermissionKey[] {
  return mergeFinancePermissions(nextEditable, external)
}

/**
 * Normalizes finance grants after one permission control changes.
 *
 * `changed` is what makes this one call instead of two: the resulting set alone
 * cannot distinguish selecting `customers:write` from clearing
 * `customers:read`, and those imply opposite fixes.
 */
export function impliedPermissions(
  selected: Iterable<FinancePermissionKey>,
  surface: FinancePermissionSurface,
  changed?: FinancePermissionKey
): FinancePermissionKey[] {
  const permissions = [...selected]
  const editable = new Set(surface.editable)

  const cleared =
    changed?.endsWith(':read') && !permissions.includes(changed)
      ? withoutFinancePermission(permissions, changed)
      : permissions

  // An implied read the surface does not own is not the editor's to add: the
  // API requires the pair, so a module split across surfaces cannot exist —
  // but a host that already holds such a grant keeps it.
  const kept = new Set(cleared)
  return withImpliedFinancePermissions(cleared).filter(
    (permission) =>
      kept.has(permission) ||
      permission === 'billing:access' ||
      editable.has(permission)
  )
}
