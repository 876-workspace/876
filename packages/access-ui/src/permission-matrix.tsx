import type { ReactElement } from 'react'
import type { AppPermissionCatalog } from '@876/core/access'
import { cn } from '@876/core/utils'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@876/ui/accordion'
import {
  AlertCircle,
  Building2,
  ChartPieIcon,
  CircleStackIcon,
  CreditCardIcon,
  Fingerprint,
  KeyIcon,
  Link2,
  Folder,
  ReceiptText,
  ShieldCheck,
  SquaresPlusIcon,
  Terminal,
  Users,
} from '@876/ui/icons'

export type PermissionMatrixModule = {
  key: string
  label: string
  permissions: Array<{ key: string; label: string; isDangerous?: boolean }>
}

type ModuleStyle = { icon: typeof KeyIcon; tile: string }

// Module colour is identity, not grant state. Emerald remains reserved for
// status language and is deliberately absent from this map.
const MODULE_STYLE: Record<string, ModuleStyle> = {
  console: {
    icon: Terminal,
    tile: 'bg-indigo-500/10 text-indigo-600 ring-indigo-500/20 dark:text-indigo-400',
  },
  users: {
    icon: Users,
    tile: 'bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-400',
  },
  organizations: {
    icon: Building2,
    tile: 'bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-400',
  },
  memberships: {
    icon: Link2,
    tile: 'bg-fuchsia-500/10 text-fuchsia-600 ring-fuchsia-500/20 dark:text-fuchsia-400',
  },
  apps: {
    icon: SquaresPlusIcon,
    tile: 'bg-cyan-500/10 text-cyan-600 ring-cyan-500/20 dark:text-cyan-400',
  },
  roles: {
    icon: ShieldCheck,
    tile: 'bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400',
  },
  team: {
    icon: Fingerprint,
    tile: 'bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400',
  },
  storage: {
    icon: CircleStackIcon,
    tile: 'bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-400',
  },
  reports: {
    icon: ChartPieIcon,
    tile: 'bg-orange-500/10 text-orange-600 ring-orange-500/20 dark:text-orange-400',
  },
  billing: {
    icon: CreditCardIcon,
    tile: 'bg-purple-500/10 text-purple-600 ring-purple-500/20 dark:text-purple-400',
  },
  requests: {
    icon: ReceiptText,
    tile: 'bg-indigo-500/10 text-indigo-600 ring-indigo-500/20 dark:text-indigo-400',
  },
  customers: {
    icon: Users,
    tile: 'bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-400',
  },
  tasks: {
    icon: ReceiptText,
    tile: 'bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-400',
  },
  teams: {
    icon: Users,
    tile: 'bg-fuchsia-500/10 text-fuchsia-600 ring-fuchsia-500/20 dark:text-fuchsia-400',
  },
  categories: {
    icon: SquaresPlusIcon,
    tile: 'bg-cyan-500/10 text-cyan-600 ring-cyan-500/20 dark:text-cyan-400',
  },
  priorities: {
    icon: AlertCircle,
    tile: 'bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400',
  },
  invoices: {
    icon: ReceiptText,
    tile: 'bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-400',
  },
  estimates: {
    icon: ReceiptText,
    tile: 'bg-purple-500/10 text-purple-600 ring-purple-500/20 dark:text-purple-400',
  },
  items: {
    icon: Folder,
    tile: 'bg-orange-500/10 text-orange-600 ring-orange-500/20 dark:text-orange-400',
  },
  payments: {
    icon: CreditCardIcon,
    tile: 'bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-400',
  },
  'payment-methods': {
    icon: CreditCardIcon,
    tile: 'bg-fuchsia-500/10 text-fuchsia-600 ring-fuchsia-500/20 dark:text-fuchsia-400',
  },
  sales: {
    icon: ChartPieIcon,
    tile: 'bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-400',
  },
  catalog: {
    icon: Folder,
    tile: 'bg-indigo-500/10 text-indigo-600 ring-indigo-500/20 dark:text-indigo-400',
  },
  subscriptions: {
    icon: Link2,
    tile: 'bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-400',
  },
  purchases: {
    icon: Folder,
    tile: 'bg-orange-500/10 text-orange-600 ring-orange-500/20 dark:text-orange-400',
  },
  vendors: {
    icon: Building2,
    tile: 'bg-purple-500/10 text-purple-600 ring-purple-500/20 dark:text-purple-400',
  },
  banking: {
    icon: CircleStackIcon,
    tile: 'bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-400',
  },
  currencies: {
    icon: CircleStackIcon,
    tile: 'bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-400',
  },
  taxes: {
    icon: ReceiptText,
    tile: 'bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400',
  },
  dashboard: {
    icon: ChartPieIcon,
    tile: 'bg-indigo-500/10 text-indigo-600 ring-indigo-500/20 dark:text-indigo-400',
  },
  settings: {
    icon: KeyIcon,
    tile: 'bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-400',
  },
  'request-forms': {
    icon: ReceiptText,
    tile: 'bg-cyan-500/10 text-cyan-600 ring-cyan-500/20 dark:text-cyan-400',
  },
  notes: {
    icon: ReceiptText,
    tile: 'bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400',
  },
  reminders: {
    icon: AlertCircle,
    tile: 'bg-orange-500/10 text-orange-600 ring-orange-500/20 dark:text-orange-400',
  },
  events: {
    icon: ReceiptText,
    tile: 'bg-fuchsia-500/10 text-fuchsia-600 ring-fuchsia-500/20 dark:text-fuchsia-400',
  },
  calendars: {
    icon: ReceiptText,
    tile: 'bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-400',
  },
  'my-work': {
    icon: Fingerprint,
    tile: 'bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-400',
  },
  'pre-alerts': {
    icon: AlertCircle,
    tile: 'bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400',
  },
  packages: {
    icon: Folder,
    tile: 'bg-indigo-500/10 text-indigo-600 ring-indigo-500/20 dark:text-indigo-400',
  },
  manifests: {
    icon: ReceiptText,
    tile: 'bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-400',
  },
  deliveries: {
    icon: Folder,
    tile: 'bg-orange-500/10 text-orange-600 ring-orange-500/20 dark:text-orange-400',
  },
  warehouse: {
    icon: Building2,
    tile: 'bg-purple-500/10 text-purple-600 ring-purple-500/20 dark:text-purple-400',
  },
}

const FALLBACK_STYLE: ModuleStyle = {
  icon: KeyIcon,
  tile: 'bg-muted text-muted-foreground ring-border/60',
}

/** Adapts an `@876/core/access` catalog into matrix modules. */
export function matrixModulesFromCatalog(
  catalog: AppPermissionCatalog
): PermissionMatrixModule[] {
  return catalog.modules.map((module) => ({
    key: module.key,
    label: module.label,
    permissions: module.permissions.map((permission) => ({
      key: permission.key,
      label: permission.label,
      isDangerous: permission.isDangerous,
    })),
  }))
}

export function PermissionMatrix({
  modules,
  held,
  emptyLabel = 'No permissions are defined.',
}: {
  modules: PermissionMatrixModule[]
  /** The effective permission keys this subject holds. */
  held: readonly string[]
  emptyLabel?: string
}): ReactElement {
  const heldKeys = new Set(held)
  if (modules.length === 0)
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>

  return (
    <Accordion multiple className="border-876-surface-border w-full border-b">
      {modules.map((module) => {
        const { icon: Icon, tile } = MODULE_STYLE[module.key] ?? FALLBACK_STYLE
        const granted = module.permissions.filter((permission) =>
          heldKeys.has(permission.key)
        ).length
        return (
          <AccordionItem
            key={module.key}
            value={module.key}
            className="border-876-surface-border not-last:border-b"
          >
            <AccordionTrigger className="hover:bg-muted/40 items-center gap-3 px-6 py-3 hover:no-underline">
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset',
                    tile
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="text-foreground truncate text-sm font-medium">
                  {module.label}
                </span>
                <span className="text-muted-foreground ms-auto shrink-0 pe-1 font-mono text-[0.6875rem] tabular-nums">{`${granted}/${module.permissions.length}`}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="bg-muted/10 px-6 pt-3 pb-5">
              <div className="flex flex-wrap gap-2">
                {module.permissions.map((permission) => {
                  const isHeld = heldKeys.has(permission.key)
                  return (
                    <span
                      key={permission.key}
                      title={permission.key}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                        isHeld
                          ? 'border-border bg-background text-foreground shadow-2xs'
                          : 'border-border/40 bg-muted/20 text-muted-foreground/40 line-through'
                      )}
                    >
                      {permission.label}
                      {permission.isDangerous ? (
                        <AlertCircle
                          aria-label="Dangerous permission"
                          className="text-destructive size-3.5"
                        />
                      ) : null}
                      <span className="sr-only">
                        {isHeld ? 'Granted' : 'Not granted'}
                      </span>
                    </span>
                  )
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
