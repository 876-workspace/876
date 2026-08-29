'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
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
  CheckIcon,
  CircleStackIcon,
  CreditCardIcon,
  KeyIcon,
  Lock,
  MinusIcon,
  SearchIcon,
  Shield,
  SquaresPlusIcon,
  Users,
} from '@876/ui/icons'
import { cn } from '@876/core/utils'
import { PERMISSION_GROUPS } from '@/lib/permissions'

/** Coverage state of one module, which drives its colour and its label. */
type Coverage = 'full' | 'partial' | 'none'

/** Which permissions the list is narrowed to. */
type Scope = 'all' | 'granted' | 'denied'

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'granted', label: 'Granted' },
  { value: 'denied', label: 'Denied' },
]

const COVERAGE_LABEL: Record<Coverage, string> = {
  full: 'Full access',
  partial: 'Partial',
  none: 'No access',
}

/** Meter fill per coverage state. Colour is status, never an action. */
const COVERAGE_BAR: Record<Coverage, string> = {
  full: 'bg-emerald-500',
  partial: 'bg-sky-500',
  none: 'bg-muted-foreground/25',
}

const COVERAGE_CHIP: Record<Coverage, string> = {
  full: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  partial: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400',
  none: 'border-border/60 bg-muted/40 text-muted-foreground',
}

const COVERAGE_TILE: Record<Coverage, string> = {
  full: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  partial: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  none: 'bg-muted text-muted-foreground/70',
}

function moduleIcon(label: string) {
  switch (label.toLowerCase()) {
    case 'users':
      return Users
    case 'organizations':
    case 'memberships':
      return Building2
    case 'applications':
    case 'apps':
      return SquaresPlusIcon
    case 'roles':
    case 'team':
      return Shield
    case 'storage':
      return CircleStackIcon
    case 'reports':
      return ChartPieIcon
    case 'billing':
      return CreditCardIcon
    default:
      return KeyIcon
  }
}

function coverageOf(granted: number, total: number): Coverage {
  if (total > 0 && granted === total) return 'full'
  return granted === 0 ? 'none' : 'partial'
}

type Row = { value: string; label: string; granted: boolean }
type Module = {
  label: string
  rows: Row[]
  visible: Row[]
  granted: number
  total: number
  coverage: Coverage
}

type Props = {
  role: string
  roleLabel: string
  permissions: readonly string[]
  canRevoke?: boolean
  revoking?: boolean
  onRevoke: () => void
  roleBadgeClass?: string
}

export function AccessPanel({
  roleLabel,
  permissions,
  canRevoke = true,
  revoking = false,
  onRevoke,
  roleBadgeClass,
}: Props) {
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<Scope>('all')
  const [open, setOpen] = useState<string[]>([])

  const held = useMemo(() => new Set(permissions), [permissions])

  const modules = useMemo<Module[]>(() => {
    const needle = query.trim().toLowerCase()

    return PERMISSION_GROUPS.map((group) => {
      const rows: Row[] = group.permissions.map((permission) => ({
        value: permission.value,
        label: permission.label,
        granted: held.has(permission.value),
      }))

      const visible = rows.filter((row) => {
        if (scope === 'granted' && !row.granted) return false
        if (scope === 'denied' && row.granted) return false
        if (!needle) return true
        return (
          row.label.toLowerCase().includes(needle) ||
          row.value.toLowerCase().includes(needle) ||
          group.label.toLowerCase().includes(needle)
        )
      })

      const granted = rows.filter((row) => row.granted).length

      return {
        label: group.label,
        rows,
        visible,
        granted,
        total: rows.length,
        coverage: coverageOf(granted, rows.length),
      }
    })
  }, [held, query, scope])

  const filtering = query.trim().length > 0 || scope !== 'all'
  const shown = filtering
    ? modules.filter((module) => module.visible.length > 0)
    : modules

  // While a filter is active the matches are what the operator asked to see, so
  // they are shown expanded rather than behind another click.
  const expanded = filtering ? shown.map((module) => module.label) : open
  const allOpen = expanded.length === shown.length && shown.length > 0

  return (
    <div className="-m-6 flex flex-col">
      {/* Filter bar */}
      <div className="border-876-surface-border bg-muted/20 flex flex-wrap items-center gap-2 border-b px-6 py-3">
        <div className="relative min-w-40 flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter permissions…"
            aria-label="Filter permissions"
            className="border-876-surface-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/40 h-8 w-full rounded-md border ps-8 pe-2.5 text-xs transition-colors outline-none focus-visible:ring-2 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>

        <div
          role="group"
          aria-label="Permission scope"
          className="bg-muted/60 inline-flex items-center gap-1 rounded-lg p-1"
        >
          {SCOPES.map((entry) => (
            <button
              key={entry.value}
              type="button"
              aria-pressed={scope === entry.value}
              onClick={() => setScope(entry.value)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                scope === entry.value
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={filtering}
          onClick={() =>
            setOpen(allOpen ? [] : shown.map((module) => module.label))
          }
          className="text-muted-foreground hover:text-foreground h-8 text-xs"
        >
          {allOpen ? 'Collapse all' : 'Expand all'}
        </Button>
      </div>

      {/* Modules */}
      {shown.length === 0 ? (
        <div className="border-876-surface-border flex flex-col items-center gap-2 border-b px-6 py-14 text-center">
          <span className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-lg">
            <SearchIcon className="size-4" />
          </span>
          <p className="text-foreground text-sm font-medium">
            No matching permissions
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setQuery('')
              setScope('all')
            }}
            className="mt-1 h-7 text-xs"
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <Accordion
          multiple
          value={expanded}
          onValueChange={(next) => setOpen(next as string[])}
          className="border-876-surface-border w-full border-b"
        >
          {shown.map((module) => {
            const Icon = moduleIcon(module.label)
            const percent =
              module.total === 0
                ? 0
                : Math.round((module.granted / module.total) * 100)

            return (
              <AccordionItem
                key={module.label}
                value={module.label}
                className="border-876-surface-border not-last:border-b"
              >
                <AccordionTrigger className="hover:bg-muted/40 items-center gap-4 px-6 py-3 hover:no-underline">
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <span
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-lg',
                        COVERAGE_TILE[module.coverage]
                      )}
                    >
                      <Icon className="size-4" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-foreground truncate text-sm font-medium">
                          {module.label}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'h-4.5 shrink-0 px-1.5 text-[0.625rem] font-medium',
                            COVERAGE_CHIP[module.coverage]
                          )}
                        >
                          {COVERAGE_LABEL[module.coverage]}
                        </Badge>
                      </span>
                      <span className="mt-1.5 flex items-center gap-2">
                        <span className="bg-muted h-1 w-full max-w-28 overflow-hidden rounded-full">
                          <span
                            className={cn(
                              'block h-full rounded-full transition-[width] duration-500 ease-out',
                              COVERAGE_BAR[module.coverage]
                            )}
                            style={{ width: `${percent}%` }}
                          />
                        </span>
                        <span className="text-muted-foreground text-[0.6875rem] tabular-nums">
                          {module.granted}/{module.total}
                        </span>
                      </span>
                    </span>
                  </span>
                </AccordionTrigger>

                <AccordionContent className="bg-muted/10 px-6 pt-1 pb-4">
                  <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {module.visible.map((row) => (
                      <li
                        key={row.value}
                        className={cn(
                          'flex items-center gap-2.5 rounded-md px-2 py-1.5',
                          row.granted ? 'bg-background/60' : ''
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            'flex size-4 shrink-0 items-center justify-center rounded-full',
                            row.granted
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-muted-foreground/10 text-muted-foreground/50'
                          )}
                        >
                          {row.granted ? (
                            <CheckIcon className="size-2.5" strokeWidth={3} />
                          ) : (
                            <MinusIcon className="size-2.5" strokeWidth={3} />
                          )}
                        </span>
                        <span
                          className={cn(
                            'truncate text-xs font-medium',
                            row.granted
                              ? 'text-foreground'
                              : 'text-muted-foreground/60'
                          )}
                        >
                          {row.label}
                        </span>
                        <code
                          className={cn(
                            'ms-auto truncate font-mono text-[0.6875rem]',
                            row.granted
                              ? 'text-muted-foreground'
                              : 'text-muted-foreground/40'
                          )}
                        >
                          {row.value}
                        </code>
                        <span className="sr-only">
                          {row.granted ? 'Granted' : 'Not granted'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}

      {/* Danger zone */}
      <div className="p-6">
        <div className="border-destructive/20 bg-destructive/5 rounded-xl border p-4 sm:p-5">
          <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-destructive size-4 shrink-0" />
                <h3 className="text-foreground text-sm font-semibold">
                  Revoke Console Access
                </h3>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Immediately revokes this member&apos;s access grant and
                terminates all active Console sessions.
              </p>
            </div>

            {canRevoke ? (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={revoking}
                onClick={onRevoke}
                className="shrink-0 self-start sm:self-auto"
              >
                {revoking ? 'Revoking…' : 'Revoke Access'}
              </Button>
            ) : (
              <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1.5 self-start text-xs sm:self-auto">
                <Lock className="size-3.5" />
                Not permitted
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
