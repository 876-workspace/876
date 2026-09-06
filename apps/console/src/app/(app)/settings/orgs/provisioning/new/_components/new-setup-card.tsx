'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { XIcon } from '@876/ui/icons'
import { CreateSetupForm } from './create-setup-form'

export function NewSetupCard() {
  const router = useRouter()

  return (
    <section
      aria-label="New provisioning setup"
      className="876-card flex min-w-0 flex-col motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-300 motion-safe:ease-out"
    >
      <header className="border-876-surface-border flex shrink-0 items-center justify-between gap-4 border-b px-6 py-4 sticky top-0 z-10 bg-[var(--876-surface)] rounded-t-[calc(var(--radius-xl)-1px)]">
        <h2 className="text-foreground truncate text-lg font-semibold tracking-tight sm:text-xl">
          New setup
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => router.push('/settings/orgs/provisioning')}
          aria-label="Close setup creation"
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <XIcon className="size-4" />
        </Button>
      </header>

      <div className="min-w-0 flex-1 p-6">
        <CreateSetupForm />
      </div>
    </section>
  )
}
