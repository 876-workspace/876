import type { ReactNode } from 'react'
import Link from 'next/link'

import {
  AccordionContent,
  AccordionItem,
  AccordionPrimitive,
} from '@876/ui/accordion'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Plus,
  type IconComponent,
} from '@876/ui/icons'

import { CountPill, IconChip, type Tone } from './overview-ui'

export function AccordionCard({
  title,
  icon,
  tone,
  count,
  addHref,
  children,
}: {
  title: string
  icon: IconComponent
  tone?: Tone
  count?: number
  addHref?: string
  children: ReactNode
}) {
  const value = title.toLowerCase()

  return (
    <section className="876-card overflow-hidden rounded-lg">
      <AccordionItem value={value} className="border-b-0">
        <AccordionPrimitive.Header className="relative flex items-center gap-2.5 px-3 py-3">
          <AccordionPrimitive.Trigger
            aria-label={title}
            className="peer/trigger focus-visible:ring-ring/50 absolute inset-0 cursor-pointer rounded-md outline-none focus-visible:ring-3"
          />
          <IconChip
            icon={icon}
            tone={tone}
            className="pointer-events-none relative size-8 shrink-0"
          />
          <span className="pointer-events-none relative min-w-0 flex-1 truncate text-sm font-semibold">
            {title}
          </span>
          {typeof count === 'number' && (
            <span className="pointer-events-none relative">
              <CountPill count={count} />
            </span>
          )}
          {addHref && (
            <Link
              href={addHref}
              aria-label={`Add ${title.toLowerCase()}`}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/60 relative z-10 flex size-6 shrink-0 items-center justify-center rounded-md transition-colors"
            >
              <Plus aria-hidden="true" className="size-3.5" />
            </Link>
          )}
          <span
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none relative flex size-6 shrink-0 items-center justify-center"
          >
            <ChevronDownIcon className="size-4 peer-aria-expanded/trigger:hidden" />
            <ChevronUpIcon className="hidden size-4 peer-aria-expanded/trigger:inline" />
          </span>
        </AccordionPrimitive.Header>
        <AccordionContent className="px-3 pb-4 [&_a]:no-underline">
          {children}
        </AccordionContent>
      </AccordionItem>
    </section>
  )
}

export function ViewAllLink({ href }: { href: string }) {
  return (
    <div className="mt-2.5 flex justify-end">
      <Link
        href={href}
        className="text-xs font-medium text-blue-600 underline! decoration-blue-600/40 underline-offset-2 transition-colors hover:decoration-blue-600 dark:text-blue-400 dark:decoration-blue-400/40 dark:hover:decoration-blue-400"
      >
        View all
      </Link>
    </div>
  )
}
