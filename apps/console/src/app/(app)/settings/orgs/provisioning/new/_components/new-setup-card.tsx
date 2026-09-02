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
      className="876-card flex h-full min-w-0 flex-col overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-300 motion-safe:ease-out"
    >
      <header className="border-876-surface-border flex shrink-0 items-center justify-between gap-4 border-b px-6 py-4">
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

      <div className="876-scroll min-h-0 flex-1 overflow-y-auto p-6">
        <CreateSetupForm />
      </div>
    </section>
  )
}
