import type { ReactNode } from 'react'
import { Plus } from '@876/ui/icons'
import { cn } from '@876/core/utils'
import { PageHeader, PageTitle, PageDescription } from '@876/ui/page'

export const metadata = { title: 'Design - Alternatives' }

/**
 * TEMPORARY design-comparison surface. Renders the "add new" button options and
 * the org-list status-indicator ("green dot") options side by side in light and
 * dark so a direction can be chosen. Delete this route once the winners are
 * promoted into the shared button variant / status tokens.
 */
export default function DesignPreviewPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-12 px-6 py-8">
      <PageHeader>
        <PageTitle>Design alternatives</PageTitle>
        <PageDescription>
          Temporary preview. Pick one “add new” button and one status indicator;
          the choice is then promoted app-wide.
        </PageDescription>
      </PageHeader>

      <Section
        title="“Add new” button"
        caption="Replaces the blue button that doesn’t blend in light mode. All three use the black / green / gold palette."
      >
        <OptionRow
          label="A — Brand green (solid)"
          hint="The established 876 primary. Most consistent with the app."
        >
          <AddButton className="bg-primary text-primary-foreground hover:bg-primary/90" />
        </OptionRow>
        <OptionRow
          label="B — Gold accent (solid)"
          hint="Warm, high-contrast call-to-action. Stands out without blue."
        >
          <AddButton className="bg-876-gold text-876-black hover:bg-876-gold/90" />
        </OptionRow>
        <OptionRow
          label="C — Soft green (tonal)"
          hint="Quiet tinted surface — blends in light mode, gentle on the eyes."
        >
          <AddButton className="bg-876-accent-surface text-876-accent-fg border-876-green/20 hover:bg-876-accent-surface-hover border" />
        </OptionRow>
      </Section>

      <Section
        title="Org-list status indicator"
        caption="Replaces the loud green “active” pill. The aim: quiet in light mode, the gray-ish feel you liked in dark mode — while keeping status legible."
      >
        <OptionRow
          label="A — Dot + label (minimal)"
          hint="No pill. A small status dot carries the color; text stays neutral."
        >
          <div className="flex flex-wrap gap-4">
            <DotStatus status="active" />
            <DotStatus status="suspended" />
            <DotStatus status="inactive" />
          </div>
        </OptionRow>
        <OptionRow
          label="B — Soft neutral pill + dot"
          hint="Muted gray pill (matches the dark-mode look) with a colored dot."
        >
          <div className="flex flex-wrap gap-4">
            <NeutralPill status="active" />
            <NeutralPill status="suspended" />
            <NeutralPill status="inactive" />
          </div>
        </OptionRow>
        <OptionRow
          label="C — Tonal pill (toned down)"
          hint="Same pill shape as today, but low-chroma so light mode isn’t shouty."
        >
          <div className="flex flex-wrap gap-4">
            <TonalPill status="active" />
            <TonalPill status="suspended" />
            <TonalPill status="inactive" />
          </div>
        </OptionRow>
      </Section>
    </div>
  )
}

function Section({
  title,
  caption,
  children,
}: {
  title: string
  caption: string
  children: ReactNode
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="876-section-title">{title}</h2>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          {caption}
        </p>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

/** One option rendered in a light pane and a dark pane, with a label. */
function OptionRow({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border">
      <div className="border-b px-4 py-2.5">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2">
        <Pane mode="light">{children}</Pane>
        <Pane mode="dark">{children}</Pane>
      </div>
    </div>
  )
}

function Pane({
  mode,
  children,
}: {
  mode: 'light' | 'dark'
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        mode === 'dark' && 'dark',
        'bg-background flex min-h-24 items-center gap-4 p-6',
        'border-t sm:border-t-0',
        mode === 'dark' && 'sm:border-l'
      )}
    >
      <span className="text-muted-foreground w-10 text-[0.625rem] tracking-wide uppercase">
        {mode}
      </span>
      {children}
    </div>
  )
}

function AddButton({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-sm font-medium transition-colors',
        className
      )}
    >
      <Plus className="size-4" strokeWidth={2.25} />
      Add new
    </span>
  )
}

type Status = 'active' | 'suspended' | 'inactive'

const DOT_COLOR: Record<Status, string> = {
  active: 'bg-876-green',
  suspended: 'bg-876-gold',
  inactive: 'bg-muted-foreground/50',
}

function StatusDot({ status }: { status: Status }) {
  return (
    <span
      aria-hidden="true"
      className={cn('size-1.5 shrink-0 rounded-full', DOT_COLOR[status])}
    />
  )
}

function DotStatus({ status }: { status: Status }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium capitalize">
      <StatusDot status={status} />
      {status}
    </span>
  )
}

function NeutralPill({ status }: { status: Status }) {
  return (
    <span className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium capitalize">
      <StatusDot status={status} />
      {status}
    </span>
  )
}

const TONAL_PILL: Record<Status, string> = {
  active:
    'border-876-green/20 bg-876-green/8 text-876-green-deep dark:text-876-green/90',
  suspended:
    'border-876-gold/25 bg-876-gold/10 text-amber-700 dark:text-876-gold',
  inactive: 'border-border bg-muted/40 text-muted-foreground',
}

function TonalPill({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
        TONAL_PILL[status]
      )}
    >
      {status}
    </span>
  )
}
