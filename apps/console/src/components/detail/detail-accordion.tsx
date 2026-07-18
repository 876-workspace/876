'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Accordion,
  AccordionItem,
  AccordionContent,
  AccordionPrimitive,
} from '@876/ui/accordion'
import * as Icons from '@876/ui/icons'

export type IconKey =
  | 'fingerprint'
  | 'globe'
  | 'key'
  | 'shield'
  | 'credit-card'
  | 'building'
  | 'calendar'
  | 'user'
  | 'flag'
  | 'activity'
  | 'ticket'
  | 'list'

const ICON_MAP: Record<IconKey, Icons.IconComponent> = {
  fingerprint: Icons.Fingerprint,
  globe: Icons.Globe,
  key: Icons.KeyRound,
  shield: Icons.ShieldCheck,
  'credit-card': Icons.CreditCard,
  building: Icons.Building2,
  calendar: Icons.Calendar,
  user: Icons.User,
  flag: Icons.Flag,
  activity: Icons.Activity,
  ticket: Icons.ClipboardList,
  list: Icons.LayoutList,
}

export function DetailAccordionGroup({
  defaultValue,
  children,
}: {
  defaultValue?: string
  children: React.ReactNode
}) {
  return (
    <Accordion
      multiple={false}
      defaultValue={defaultValue ? [defaultValue] : []}
      className="flex flex-col gap-4"
    >
      {children}
    </Accordion>
  )
}

export function DetailAccordionSection({
  title,
  icon,
  value,
  count,
  description,
  addHref,
  children,
}: {
  title: string
  icon?: IconKey
  value: string
  count?: number
  description?: string
  addHref?: string
  children: React.ReactNode
}) {
  const Icon = icon ? ICON_MAP[icon] : null

  return (
    <section className="876-card overflow-hidden">
      <AccordionItem value={value} className="border-b-0">
        <AccordionPrimitive.Header className="relative flex items-center gap-2.5 px-3 py-3">
          <AccordionPrimitive.Trigger
            aria-label={title}
            className="peer/trigger focus-visible:ring-ring/50 absolute inset-0 cursor-pointer rounded-md outline-none focus-visible:ring-3"
          />
          {Icon && (
            <span className="bg-876-accent-surface text-876-accent-fg pointer-events-none relative flex size-7 shrink-0 items-center justify-center rounded-md">
              <Icon aria-hidden="true" className="size-3.5" />
            </span>
          )}
          <span className="pointer-events-none relative min-w-0 flex-1">
            <span className="876-section-title block truncate">{title}</span>
            {description && (
              <span className="text-muted-foreground mt-1 block text-xs font-normal">
                {description}
              </span>
            )}
          </span>
          {typeof count === 'number' && (
            <span className="bg-muted text-muted-foreground pointer-events-none relative inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium">
              {count}
            </span>
          )}
          {addHref && (
            <Link
              href={addHref}
              aria-label={`Add ${title.toLowerCase()}`}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/60 relative z-10 flex size-6 shrink-0 items-center justify-center rounded-md transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Icons.Plus aria-hidden="true" className="size-3.5" />
            </Link>
          )}
          <span
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none relative flex size-6 shrink-0 items-center justify-center"
          >
            <Icons.ChevronDown className="size-4 peer-aria-expanded/trigger:hidden" />
            <Icons.ChevronUp className="hidden size-4 peer-aria-expanded/trigger:inline" />
          </span>
        </AccordionPrimitive.Header>
        <AccordionContent className="px-3 pb-4 [&_a]:no-underline">
          <div className="border-876-surface-border border-t pt-3">
            {children}
          </div>
        </AccordionContent>
      </AccordionItem>
    </section>
  )
}
