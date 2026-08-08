'use client'

import { useState } from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@876/ui/accordion'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { Settings } from '@876/ui/icons'
import { cn } from '@876/ui/lib/utils'

import { FeatureToggle } from '@/components/patterns/feature-toggle'
import { FlagTargetingSheet, type FlagTarget } from './flag-targeting-sheet'

export type AccessFlag = FlagTarget & {
  /** True when this flag is a child of the scope's master flag. */
  child: boolean
}

export type AccessScope = {
  /** Stable key — the widget host, or `platform`. */
  key: string
  label: string
  logoUrl: string | null
  flags: AccessFlag[]
}

function overrideCount(flag: FlagTarget): number {
  return flag.orgOverrides.length + flag.userOverrides.length
}

function scopeIsLive(flags: AccessFlag[]): boolean {
  // A scope only grants access when its master and at least one child are on —
  // the same AND the evaluator applies.
  const master = flags.find((flag) => !flag.child)
  if (master && !master.enabled) return false
  return flags.some((flag) => flag.child && flag.enabled)
}

function initials(label: string): string {
  return (
    label
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 2)
      .toUpperCase() || '?'
  )
}

/**
 * Access is grouped by the app it applies to, because that is the unit an
 * admin actually reasons about — "is Notepad on in Couriers?" — rather than by
 * flag key, which forces them to decode a slug prefix to answer the same
 * question. The platform scope leads, since it gates every app beneath it.
 */
export function FeatureAccessBoard({ scopes }: { scopes: AccessScope[] }) {
  const [openFlagId, setOpenFlagId] = useState<string | null>(null)
  const allFlags = scopes.flatMap((scope) => scope.flags)
  const openFlag = allFlags.find((flag) => flag.id === openFlagId) ?? null

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-[0.8125rem]">
        A user override wins over an organization override, which wins over the
        app default. A disabled flag stays off regardless.
      </p>

      <div className="876-card overflow-hidden">
        <Accordion
          defaultValue={scopes.length > 0 ? [scopes[0]!.key] : []}
          className="px-4"
        >
          {scopes.map((scope) => {
            const overrides = scope.flags.reduce(
              (total, flag) => total + overrideCount(flag),
              0
            )
            const live = scopeIsLive(scope.flags)

            return (
              <AccordionItem key={scope.key} value={scope.key}>
                <AccordionTrigger className="hover:no-underline">
                  <span className="flex min-w-0 flex-1 items-center gap-3 pr-3">
                    <Avatar size="sm">
                      {scope.logoUrl ? (
                        <AvatarImage src={scope.logoUrl} alt="" />
                      ) : null}
                      <AvatarFallback>{initials(scope.label)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate font-medium">{scope.label}</span>
                    <span className="ml-auto flex shrink-0 items-center gap-2">
                      {overrides > 0 && (
                        <Badge variant="secondary">
                          {overrides} override{overrides === 1 ? '' : 's'}
                        </Badge>
                      )}
                      <Badge variant={live ? 'success' : 'secondary'}>
                        {live ? 'On' : 'Off'}
                      </Badge>
                    </span>
                  </span>
                </AccordionTrigger>

                <AccordionContent>
                  <ul className="border-876-surface-border divide-876-surface-border mb-4 divide-y rounded-md border">
                    {scope.flags.map((flag) => (
                      <li
                        key={flag.id}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5',
                          // A child is drawn one step in, with a hairline
                          // stem, so the master/child AND is readable at a
                          // glance instead of inferred from the slug prefix.
                          flag.child &&
                            'before:bg-876-surface-border relative pl-8 before:absolute before:top-1/2 before:left-4 before:h-px before:w-2.5 before:content-[""]'
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.8125rem] font-medium">
                            {flag.name}
                          </span>
                          <span className="text-muted-foreground block truncate font-mono text-xs">
                            {flag.slug}
                          </span>
                        </span>

                        {overrideCount(flag) > 0 && (
                          <Badge variant="secondary" className="shrink-0">
                            {overrideCount(flag)}
                          </Badge>
                        )}

                        <FeatureToggle
                          feature={{
                            id: flag.id,
                            name: flag.name,
                            enabled: flag.enabled,
                          }}
                        />

                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Targeting for ${flag.name}`}
                          onClick={() => setOpenFlagId(flag.id)}
                        >
                          <Settings className="size-4" />
                        </Button>
                      </li>
                    ))}

                    {scope.flags.length === 0 && (
                      <li className="text-muted-foreground px-3 py-4 text-[0.8125rem]">
                        No flags registered for this app.
                      </li>
                    )}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </div>

      <FlagTargetingSheet
        flag={openFlag}
        open={openFlag !== null}
        onOpenChange={(next) => {
          if (!next) setOpenFlagId(null)
        }}
      />
    </div>
  )
}
