import { FINANCE_MODULES } from '../modules'

/**
 * The 876 finance permission catalog — the single owner of the permission keys
 * `apps/billing-api` enforces on every tenant route.
 *
 * This is **not** the app-access catalog in `./catalogs.ts`. The two planes
 * answer different questions and deliberately use different key shapes:
 *
 * | Plane | Question | Keys | Storage |
 * | --- | --- | --- | --- |
 * | app access (`./catalogs.ts`) | may this person open Billing/Invoice? | `customers.view` | core identity DB, per app |
 * | finance (this file) | what may they do to finance data? | `customers:read` | `billing_roles`, per tenant |
 *
 * The colon keys are a durable persisted contract: they sit in
 * `billing_roles.permissions` rows and in every `security: { kind: 'tenant' }`
 * route declaration, so they are renamed only through the coordinated
 * migration `.claude/rules/naming.md` describes — never as a refactor.
 *
 * 876 Billing and 876 Invoice share one finance workspace per organization, so
 * they share these roles. What differs is the **surface** each product may
 * edit: Invoice never shows a subscriptions, banking, purchases, or vendors
 * permission, because Invoice has no such feature. A role may still hold
 * permissions outside the editing surface — see `partitionFinancePermissions`.
 */

/** One permission a finance role may grant. */
export type FinancePermissionKey = string

export type FinancePermissionModule = {
  /** Stable module key, e.g. `customers`. */
  key: string
  /** Human label used by every role editor. */
  label: string
  /** The permission keys this module owns, in display order. */
  permissions: { key: FinancePermissionKey; label: string }[]
}

/** The products that may edit finance roles. */
export type FinanceApp = 'billing' | 'invoice'

function readWrite(key: string, label: string): FinancePermissionModule {
  return {
    key,
    label,
    permissions: [
      { key: `${key}:read`, label: 'View' },
      { key: `${key}:write`, label: 'Manage' },
    ],
  }
}

function readWriteModule(definition: {
  key: string
  label: string
}): FinancePermissionModule {
  return readWrite(definition.key, definition.label)
}

function readOnly(key: string, label: string): FinancePermissionModule {
  return { key, label, permissions: [{ key: `${key}:read`, label: 'View' }] }
}

/**
 * Every permission the finance plane defines, grouped by module.
 *
 * `billing:access` is deliberately its own module: it is the gate every role
 * must hold, not a capability anyone chooses, so `access.schemas.ts` refuses a
 * role without it.
 */
export const FINANCE_PERMISSION_MODULES: readonly FinancePermissionModule[] = [
  {
    key: 'billing',
    label: 'Workspace access',
    permissions: [{ key: 'billing:access', label: 'Access' }],
  },
  readOnly('dashboard', 'Dashboard'),
  readWriteModule(FINANCE_MODULES.customers),
  readWrite('catalog', 'Items & catalog'),
  readWrite('sales', 'Sales documents'),
  readWriteModule(FINANCE_MODULES.payments),
  // Handling a stored instrument is a different sensitivity from recording a
  // receipt: a bookkeeper can reconcile payments without being able to attach
  // or detach a customer's card.
  readWrite('payment_methods', 'Payment methods'),
  readWrite('currencies', 'Currencies'),
  readWrite('taxes', 'Taxes'),
  readOnly('reports', 'Reports'),
  readOnly('settings', 'Settings'),
  readWrite('members', 'Members'),
  readWrite('roles', 'Roles'),
  readWriteModule(FINANCE_MODULES.subscriptions),
  readWrite('vendors', 'Vendors'),
  readWriteModule(FINANCE_MODULES.purchases),
  readWriteModule(FINANCE_MODULES.banking),
] as const

/**
 * The modules 876 Invoice may edit.
 *
 * Invoice sells document workflow; recurring revenue, banking, purchasing and
 * vendor management belong to 876 Billing. Keeping the list explicit rather
 * than subtractive means adding a Billing module never silently leaks into
 * Invoice's role editor.
 */
const INVOICE_MODULE_KEYS: readonly string[] = [
  'billing',
  'dashboard',
  'customers',
  'catalog',
  'sales',
  'payments',
  'taxes',
  'reports',
  'settings',
  'members',
  'roles',
]

const SURFACE_MODULE_KEYS: Record<FinanceApp, readonly string[]> = {
  billing: FINANCE_PERMISSION_MODULES.map((module) => module.key),
  invoice: INVOICE_MODULE_KEYS,
}

/** Every finance permission key, sorted, deduplicated. */
export const FINANCE_PERMISSION_VALUES: readonly FinancePermissionKey[] = [
  ...new Set(
    FINANCE_PERMISSION_MODULES.flatMap((module) =>
      module.permissions.map((permission) => permission.key)
    )
  ),
].sort()

export type FinancePermissionSurface = {
  app: FinanceApp
  modules: FinancePermissionModule[]
  /** Every key in `modules`, precomputed for membership tests. */
  editable: FinancePermissionKey[]
}

/** The modules and keys `app` is allowed to present and edit. */
export function financePermissionSurface(
  app: FinanceApp
): FinancePermissionSurface {
  const allowed = new Set(SURFACE_MODULE_KEYS[app])
  const modules = FINANCE_PERMISSION_MODULES.filter((module) =>
    allowed.has(module.key)
  ).map((module) => ({ ...module, permissions: [...module.permissions] }))

  return {
    app,
    modules,
    editable: modules
      .flatMap((module) => module.permissions.map(({ key }) => key))
      .sort(),
  }
}

/**
 * Splits a role's permissions into the ones this surface may edit and the ones
 * it may not.
 *
 * Billing and Invoice share one workspace, so an Invoice admin can open a role
 * that also carries `subscriptions:write`. Showing those as absent — and then
 * writing the visible set back — would silently revoke Billing access on save.
 */
export function partitionFinancePermissions(
  permissions: readonly FinancePermissionKey[],
  surface: FinancePermissionSurface
): { editable: FinancePermissionKey[]; external: FinancePermissionKey[] } {
  const inSurface = new Set(surface.editable)
  const editable: FinancePermissionKey[] = []
  const external: FinancePermissionKey[] = []

  for (const permission of permissions)
    if (inSurface.has(permission)) editable.push(permission)
    else external.push(permission)

  return { editable: editable.sort(), external: external.sort() }
}

/** Recombines an edited selection with the permissions the surface never saw. */
export function mergeFinancePermissions(
  editable: readonly FinancePermissionKey[],
  external: readonly FinancePermissionKey[]
): FinancePermissionKey[] {
  return [...new Set([...editable, ...external])].sort()
}

/**
 * Applies the finance plane's own invariants to a selection.
 *
 * `access.schemas.ts` rejects a role that omits `billing:access` or that holds
 * a `:write` without its `:read`, so the editor enforces the same rules rather
 * than letting the API reject a selection the operator was allowed to build.
 */
export function withImpliedFinancePermissions(
  selected: readonly FinancePermissionKey[]
): FinancePermissionKey[] {
  const next = new Set(selected)
  next.add('billing:access')

  for (const permission of selected)
    if (permission.endsWith(':write'))
      next.add(permission.replace(/:write$/, ':read'))

  return [...next].sort()
}

/**
 * Clearing a view permission clears the manage permission that depends on it.
 * The editor calls this when a checkbox is unset, so the pair can never end up
 * in the state the API rejects.
 */
export function withoutFinancePermission(
  selected: readonly FinancePermissionKey[],
  permission: FinancePermissionKey
): FinancePermissionKey[] {
  const next = new Set(selected)
  next.delete(permission)
  if (permission.endsWith(':read'))
    next.delete(permission.replace(/:read$/, ':write'))
  // `billing:access` is not a capability anyone opts out of.
  next.add('billing:access')
  return [...next].sort()
}
