import { buttonVariants } from '@876/ui/button'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { platform } from '@/lib/services/platform'
import { resolveApp } from '../../_data'
import { CreateProfileForm } from '../_components/create-profile-form'

type Props = { params: Promise<{ slug: string }> }

export default async function NewApplicationProvisioningProfilePage({
  params,
}: Props) {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) notFound()

  const result = await platform.provisioning.applicationProfiles.list(app.id)
  if (result.error || !result.data)
    throw new Error(
      result.error?.message ?? 'Failed to load application provisioning profiles.'
    )

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/apps/${encodeURIComponent(app.slug)}/provisioning`}
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          Back to profiles
        </Link>
      </div>

      <section className="876-card p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">New provisioning profile</h2>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Create an independent {app.name} provisioning profile. New variants
            start as drafts and do not participate in routing until they have
            conditions, a published manifest, and are activated.
          </p>
        </div>
        <CreateProfileForm
          appId={app.id}
          appSlug={app.slug}
          profiles={result.data.data}
        />
      </section>
    </div>
  )
}
