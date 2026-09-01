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
import { ProfileCardFrame } from './_components/profile-card-frame'

export const metadata = { title: 'Provisioning profile' }

type Props = {
  params: Promise<{ slug: string; profileKey: string }>
}

export default async function ApplicationProvisioningProfilePage({
  params,
}: Props) {
  const { slug, profileKey } = await params
  const app = await resolveApp(slug)
  if (!app) notFound()

  const [
    profileResult,
    manifestResult,
    catalogResult,
    currenciesResult,
    languagesResult,
  ] = await Promise.all([
    platform.provisioning.applicationProfiles.retrieve(app.id, profileKey),
    platform.provisioning.applicationProfiles.retrieveManifest(
      app.id,
      profileKey
    ),
    workspace.provisioning.retrieveCatalog('application', app.id),
    workspace.geo.listCurrencies(),
    workspace.geo.listLanguages(),
  ])

  if (profileResult.error?.code === 'provisioning/application-profile-not-found')
    notFound()
  if (profileResult.error || !profileResult.data)
    throw new Error(
      profileResult.error?.message ?? 'Failed to load provisioning profile.'
    )

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
  const manifestRevision =
    manifestResult.data?.draft ?? manifestResult.data?.published ?? null
  const resourceSections = catalogResult.data.resource_types.map(
    (definition) => {
      const resourceType =
        definition.resource_type ||
        (definition as { resourceType?: string }).resourceType ||
        ''

      return {
        key: resourceType,
        label: shortResourceLabel(resourceType, definition.label),
        count:
          manifestRevision?.resources.filter(
            (resource) => resource.resource_type === resourceType
          ).length ?? 0,
        content: (
          <FinanceProvisioningEditor
            catalog={catalogResult.data}
            manifest={manifestResult.data ?? null}
            target={{
              type: 'application',
              key: app.id,
              profileKey: profile.key,
            }}
            initialType={resourceType}
            currencyOptions={toFinanceCurrencyOptions(currenciesResult.data)}
            languageOptions={toFinanceLanguageOptions(languagesResult.data)}
          />
        ),
      }
    }
  )

  return (
    <ProfileCardFrame
      profile={profile}
      slug={app.slug}
      appId={app.id}
      overviewContent={
        <ProfileSettingsForm appId={app.id} profile={profile} mode="settings" />
      }
      routingContent={
        <ProfileSettingsForm appId={app.id} profile={profile} mode="routing" />
      }
      resourceSections={resourceSections}
    />
  )
}

function shortResourceLabel(resourceType: string, fallback: string): string {
  const labels: Record<string, string> = {
    app_role: 'Roles',
    document_preference: 'Documents',
    request_priority: 'Priorities',
    request_category: 'Categories',
    request_subcategory: 'Subcategories',
  }

  return labels[resourceType] ?? fallback
}
