'use client'

import { useRouter } from 'next/navigation'
import type { ApplicationProvisioningProfile } from '@876/core/types/application-provisioning-profile'
import { Button } from '@876/ui/button'
import { XIcon } from '@876/ui/icons'
import { CreateProfileForm } from '../../_components/create-profile-form'

export function NewProfileCard({
  appId,
  appSlug,
  appName,
  profiles,
}: {
  appId: string
  appSlug: string
  appName: string
  profiles: ApplicationProvisioningProfile[]
}) {
  const router = useRouter()

  return (
    <section
      aria-label="New provisioning profile"
      className="876-card flex h-full min-w-0 flex-col overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-300 motion-safe:ease-out"
    >
      <header className="border-876-surface-border flex shrink-0 items-center justify-between gap-4 border-b px-6 py-4">
        <h2 className="text-foreground truncate text-lg font-semibold tracking-tight sm:text-xl">
          New profile
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() =>
            router.push(`/apps/${encodeURIComponent(appSlug)}/provisioning`)
          }
          aria-label="Close profile creation"
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <XIcon className="size-4" />
        </Button>
      </header>

      <div className="876-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
        <div className="mb-6">
          <p className="text-muted-foreground max-w-2xl text-xs">
            Create an independent {appName} provisioning profile. New variants
            start as drafts and do not participate in routing until they have
            conditions, a published manifest, and are activated.
          </p>
        </div>
        <CreateProfileForm
          appId={appId}
          appSlug={appSlug}
          profiles={profiles}
        />
      </div>
    </section>
  )
}
