import type { ReactNode } from 'react'

import { Label } from '@876/ui/label'
import { Page, PageHeader, PageTitle } from '@876/ui/page'
import { Textarea } from '@876/ui/textarea'
import { cn } from '@876/ui/lib/utils'

/**
 * A document editor page: one white sheet under a ruled title bar, the way a
 * document reads, instead of controls floating on the grey app canvas.
 */
export function DocumentFormPage({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <Page className="bg-876-surface min-h-full">
      <PageHeader className="border-border -mx-[var(--876-shell-gutter)] -mt-5 mb-0 border-b px-[var(--876-shell-gutter)] py-4">
        <PageTitle>{title}</PageTitle>
      </PageHeader>
      {children}
    </Page>
  )
}

/**
 * The opening section that holds the customer, so who the document is for
 * reads first. White like the rest of the sheet, closed by a full-width rule.
 */
export function DocumentFormBand({ children }: { children: ReactNode }) {
  return (
    <section className="border-border -mx-[var(--876-shell-gutter)] border-b px-[var(--876-shell-gutter)] py-6">
      {children}
    </section>
  )
}

/** One group of document fields, divided from the next by a rule rather than a card. */
export function DocumentFormSection({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        'border-border space-y-4 border-b py-6 last:border-b-0',
        className
      )}
    >
      {children}
    </section>
  )
}

/** The notes column beside a document's totals. */
export function DocumentNotesField({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div className="max-w-2xl space-y-2">
      <Label htmlFor={id}>Customer notes</Label>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Thanks for your business."
        rows={3}
        disabled={disabled}
      />
    </div>
  )
}

/** Terms and conditions, full width under the totals. */
export function DocumentTermsField({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <section className="space-y-2 pt-6">
      <Label htmlFor={id}>Terms and conditions</Label>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Enter the terms and conditions of your business to be displayed on the document"
        rows={4}
        disabled={disabled}
        className="max-w-4xl"
      />
    </section>
  )
}

/** Notes on the left, totals on the right — the bottom of every document form. */
export function DocumentFormSummaryGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,32rem)]">
      {children}
    </div>
  )
}
