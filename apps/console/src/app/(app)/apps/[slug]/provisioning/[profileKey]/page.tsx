import { buttonVariants } from '@876/ui/button'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { FinanceProvisioningEditor } from '@/features/provisioning/components/finance-provisioning-editor'
import {
  toFinanceCurrencyOptions,
  toFinanceLanguageOptions,
} from '@/features/provisioning/finance-provisioning-utils'
import { platform } from '@/lib/services/platform'
import { workspace } from '@/lib/services/workspace'
import { resolveApp } from '../../_data'
import { ProfileSettingsForm } from '../_components/profile-settings-form'

type Props = {
  params: Promise<{ slug: string; profileKey: string }>
}

export default async function ApplicationProvisioningProfilePage({
  params,
}: Props) {
  const { slug, profileKey } = await params
  const app = await resolveApp(slug)
  if (!app) notFound()

  const [profileResult, manifestResult, catalogResult, currenciesResult, languagesResult] =
    await Promise.all([
      platform.provisioning.applicationProfiles.retrieve(app.id, profileKey),
      platform.provisioning.applicationProfiles.retrieveManifest(app.id, profileKey),
      workspace.provisioning.retrieveCatalog('application', app.id),
      workspace.geo.listCurrencies(),
      workspace.geo.listLanguages(),
    ])

  if (
    profileResult.error?.code === 'provisioning/application-profile-not-found' ||
    !profileResult.data
  )
    notFound()
  if (profileResult.error)
    throw new Error(profileResult.error.message)

  if (
    manifestResult.error &&
    manifestResult.error.code !== 'provisioning/manifest-not-found'
  )
    throw new Error(manifestResult.error.message)
  if (catalogResult.error || !catalogResult.data)
    throw new Error(
      catalogResult.error?.message ?? 'Failed to load provisioning catalog.'
    )
  if (currenciesResult.error || !currenciesResult.data)
    throw new Error(
      currenciesResult.error?.message ?? 'Failed to load currencies.'
    )
  if (languagesResult.error || !languagesResult.data)
    throw new Error(
      languagesResult.error?.message ?? 'Failed to load languages.'
    )

  const profile = profileResult.data

  return (
    <div className="space-y-5">
      <section className="876-card flex flex-wrap items-start justify-between gap-4 p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{profile.name}</h2>
            {profile.is_default ? (
              <span className="bg-muted rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                Default
              </span>
            ) : null}
            <span className="text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
              {profile.status}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {profile.key} · {profile.selection_count} selected organizations ·{' '}
            {profile.published_revision === null
              ? 'not published'
              : `published revision ${profile.published_revision}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/apps/${encodeURIComponent(app.slug)}/provisioning`}
            className={buttonVariants({ variant: 'outline' })}
          >
            All profiles
          </Link>
          <Link
            href={`/settings/orgs/provisioning/runs?app_id=${encodeURIComponent(app.id)}`}
            className={buttonVariants({ variant: 'outline' })}
          >
            View runs
          </Link>
        </div>
      </section>

      <section className="876-card p-6">
        <ProfileSettingsForm appId={app.id} profile={profile} />
      </section>

      <section className="876-card overflow-hidden">
        <div className="border-b px-6 py-4">
          <h3 className="text-sm font-semibold">Provisioned application defaults</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            This is manifest v1 for this profile only. Publishing changes affects
            future reconciliations for organizations already assigned this
            profile, but does not change which profile an organization uses.
          </p>
        </div>
        <FinanceProvisioningEditor
          catalog={catalogResult.data}
          manifest={manifestResult.data ?? null}
          target={{
            type: 'application',
            key: app.id,
            profileKey: profile.key,
          }}
          currencyOptions={toFinanceCurrencyOptions(currenciesResult.data)}
          languageOptions={toFinanceLanguageOptions(languagesResult.data)}
        />
      </section>
    </div>
  )
}
