import type { ReactNode } from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@876/ui/accordion'
import type { IconComponent } from '@876/ui/icons'
import { cn } from '@876/core/utils'

/** Soft per-section icon tints — distinct colors without leaning on brand green. */
const TONES = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
} as const
export type AccordionTone = keyof typeof TONES

/**
 * Left-column accordion group for detail overview pages. `defaultOpen` names
 * the section (its lowercased title) that starts expanded; multiple sections
 * may be open at once so the primary section stays visible.
 */
export function DetailAccordion({
  defaultOpen,
  children,
}: {
  defaultOpen?: string
  children: ReactNode
}) {
  return (
    <Accordion
      multiple={false}
      defaultValue={defaultOpen ? [defaultOpen] : []}
      className="gap-4"
    >
      {children}
    </Accordion>
  )
}

function IconChip({
  icon: Icon,
  tone = 'blue',
}: {
  icon: IconComponent
  tone?: AccordionTone
}) {
  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-md',
        TONES[tone]
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
    </span>
  )
}

export function DetailAccordionCard({
  title,
  icon,
  tone,
  children,
}: {
  title: string
  icon: IconComponent
  tone?: AccordionTone
  children: ReactNode
}) {
  const value = title.toLowerCase()
  return (
    <section className="876-card overflow-hidden rounded-lg">
      <AccordionItem value={value} className="border-b-0">
        <AccordionTrigger className="px-3 py-3 hover:no-underline">
          <span className="flex flex-1 items-center gap-2.5">
            <IconChip icon={icon} tone={tone} />
            <span className="text-sm font-semibold">{title}</span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-3 pb-4">{children}</AccordionContent>
      </AccordionItem>
    </section>
  )
}

/** Responsive label-over-value grid for accordion detail cards. */
export function FactGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">{children}</dl>
}

export function Fact({
  label,
  value,
  mono,
}: {
  label: string
  value: ReactNode
  mono?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={cn('mt-1 truncate text-sm', mono && 'font-mono')}>
        {value}
      </dd>
    </div>
  )
}
