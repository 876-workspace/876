import type { AppPermission, AppPermissionCatalog } from '@876/core/access'
import { appPermissionCatalogs } from '@876/core/access/catalogs'

/**
 * Console-namespaced projections of every product's own permission catalog,
 * plus the small set of actions that exist only for 876 itself.
 *
 * `.claude/rules/access-control.md` and the console workspace/sidebar plan
 * (`plans/2026-09-03-console-workspace-and-sidebar/plan.md` §6) both require
 * the same thing: a Console operator acting inside a product (CRM, Couriers, …)
 * is projected that product's own `<module>.<action>` vocabulary, under a
 * namespace that cannot collide with another product's — `crm/requests.view`,
 * `couriers/packages.edit` — never the org-member permission itself, and never
 * a second hand-typed copy of it.
 *
 * **Generated, not hand-declared.** `operatorProductCatalogs()` derives every
 * projected key from `@876/core/access/catalogs`'s `appPermissionCatalogs` at
 * call time. There is nothing to keep in sync: if a product adds a permission
 * to its catalog, the projection has it on the next call, and
 * `operator-permissions.test.ts` is a drift *proof*, not a drift *check* — it
 * asserts the projection over the live catalogs, so it cannot pass against a
 * stale copy because there is no copy.
 *
 * Purge is deliberately separate from every product's own `*.delete` action.
 * `.claude/rules/deletions.md` already treats reversible Delete and destructive
 * Purge as different operations platform-wide; `operatorExclusiveCatalog()` is
 * the same split applied to a product's own records, and it is **Console-only**
 * — it must never appear in a product's own `AppPermissionCatalog`, because a
 * vendor's own admin must not be able to grant themselves platform
 * intervention on their own data.
 */

/** Strips the `876-` app-slug prefix Console's projection does not repeat. */
function shortAppSlug(appSlug: string): string {
  return appSlug.startsWith('876-') ? appSlug.slice(4) : appSlug
}

/** Every product app slug with its own permission catalog, Console excluded. */
function productAppSlugs(): string[] {
  return Object.keys(appPermissionCatalogs).filter((slug) => slug !== 'console')
}

/**
 * One product's catalog, reprojected under its Console namespace.
 *
 * Every field but `key` is untouched, so a role editor grouping by
 * `catalog.modules` needs no product-specific rendering: it is the same
 * `AppPermissionCatalog` shape `groupByModule` already knows how to draw.
 */
function projectCatalog(appSlug: string, catalog: AppPermissionCatalog) {
  const namespace = shortAppSlug(appSlug)
  return {
    app: namespace,
    modules: catalog.modules.map((productModule) => ({
      ...productModule,
      permissions: productModule.permissions.map((permission) => ({
        ...permission,
        key: `${namespace}/${permission.key}`,
      })),
    })),
    permissions: catalog.permissions.map((permission) => ({
      ...permission,
      key: `${namespace}/${permission.key}`,
    })),
  } satisfies AppPermissionCatalog
}

/** Every product's catalog, reprojected under its Console namespace. */
export function operatorProductCatalogs(): AppPermissionCatalog[] {
  return productAppSlugs().map((appSlug) =>
    projectCatalog(appSlug, appPermissionCatalogs[appSlug]!)
  )
}

/**
 * The Console-only action(s) that exist outside any product's own catalog,
 * each with its own label template and danger flag.
 *
 * `view-all` is the §3.3 cross-organization operator list — "all open
 * requests from every organization" — as opposed to a product's own `view`,
 * which is scoped to one organization by construction (the CRM API's
 * `GET /v1/requests` cross-org route is itself gated by a shared internal
 * service credential, not a per-operator one; the *only* per-operator
 * authorization boundary for who among Console's staff may see every
 * organization's data at once is this key). Not dangerous — it discloses
 * data, it doesn't destroy it — so it is withheld from `isDangerous`.
 *
 * `.claude/rules/access-control.md` and §6.4 of the plan deliberately leave
 * room for more (an intervention/dispute action, for instance) without
 * pre-declaring keys no feature grants meaning to yet — add an entry here
 * only when a real capability needs it.
 */
const OPERATOR_EXCLUSIVE_ACTIONS: readonly {
  action: string
  label: (appLabel: string) => string
  isDangerous: boolean
}[] = [
  {
    action: 'purge',
    label: (appLabel) => `Purge ${appLabel} records`,
    isDangerous: true,
  },
  {
    action: 'view-all',
    label: (appLabel) => `View ${appLabel} records across every organization`,
    isDangerous: false,
  },
]

/**
 * The Console-only catalog: one `purge` and one `view-all` permission per
 * product today. See `OPERATOR_EXCLUSIVE_ACTIONS` for what each means.
 */
export function operatorExclusiveCatalog(): AppPermissionCatalog {
  const modules = productAppSlugs().map((appSlug, position) => {
    const namespace = shortAppSlug(appSlug)
    const catalog = appPermissionCatalogs[appSlug]!
    return {
      key: namespace,
      label: catalog.app,
      position,
      permissions: OPERATOR_EXCLUSIVE_ACTIONS.map(
        ({ action, label, isDangerous }, actionIndex): AppPermission => ({
          key: `console:${namespace}.${action}`,
          moduleKey: namespace,
          action,
          label: label(catalog.app),
          isDangerous,
          position: actionIndex,
        })
      ),
    }
  })

  return {
    app: 'console-operator',
    modules,
    permissions: modules.flatMap((productModule) => productModule.permissions),
  }
}

/**
 * The complete universe of permission keys a Console role may hold: Console's
 * own vocabulary, every product's projected keys, and the operator-exclusive
 * keys. Pass this as `resolveEffectivePermissions`' `catalog` — the console
 * catalog alone would strip a projected or exclusive key out of every role
 * that holds one, silently, because `resolveEffectivePermissions` intersects
 * against exactly the catalog it is given.
 */
export function operatorPermissions(
  consoleCatalog: AppPermissionCatalog
): AppPermission[] {
  return [
    ...consoleCatalog.permissions,
    ...operatorProductCatalogs().flatMap((catalog) => catalog.permissions),
    ...operatorExclusiveCatalog().permissions,
  ]
}

/** Whether the operator holds any projected permission at all for a product. */
export function hasAnyProductPermission(
  permissions: readonly string[],
  appSlug: string
): boolean {
  const prefix = `${shortAppSlug(appSlug)}/`
  return permissions.some((permission) => permission.startsWith(prefix))
}

/**
 * Every projected product key, optionally narrowed by action (e.g. `'view'`
 * for a read-only role). Used to build the built-in system roles' product
 * grants without hand-listing keys a catalog already generates.
 */
export function projectedPermissionKeys(
  actionFilter?: (action: string) => boolean
): string[] {
  return operatorProductCatalogs()
    .flatMap((catalog) => catalog.permissions)
    .filter((permission) => !actionFilter || actionFilter(permission.action))
    .map((permission) => permission.key)
}

/**
 * Every Console-only operator-exclusive key, optionally narrowed by action
 * (e.g. `'view-all'` for the cross-organization read grant, without also
 * pulling in `'purge'`).
 */
export function operatorExclusivePermissionKeys(
  actionFilter?: (action: string) => boolean
): string[] {
  return operatorExclusiveCatalog()
    .permissions.filter(
      (permission) => !actionFilter || actionFilter(permission.action)
    )
    .map((permission) => permission.key)
}
