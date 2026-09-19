import { notFound } from 'next/navigation'
import { AppError } from '@876/ui/app-error'

import { FinanceProvisioningEditor } from '@/features/provisioning/components/finance-provisioning-editor'
import {
  toFinanceCurrencyOptions,
  toFinanceLanguageOptions,
} from '@/features/provisioning/finance-provisioning-utils'
import { platform } from '@/lib/clients/platform'
import {
  getProvisioningCatalog,
  getProvisioningReferenceData,
} from '@/lib/console/provisioning'
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
    { currencies: currenciesResult, languages: languagesResult },
  ] = await Promise.all([
    platform.provisioning.applicationProfiles.retrieve(app.id, profileKey),
    platform.provisioning.applicationProfiles.retrieveManifest(
      app.id,
      profileKey
    ),
    getProvisioningCatalog('application', app.id),
    getProvisioningReferenceData(),
  ])

  if (
    profileResult.error?.code === 'provisioning/application-profile-not-found'
  )
    notFound()
  if (profileResult.error)
    return <AppError error={profileResult.error} variant="banner" showCode />

  if (
    manifestResult.error &&
    manifestResult.error.code !== 'provisioning/manifest-not-found'
  )
    return <AppError error={manifestResult.error} variant="banner" showCode />
  if (catalogResult.error)
    return <AppError error={catalogResult.error} variant="banner" showCode />
  if (currenciesResult.error)
    return <AppError error={currenciesResult.error} variant="banner" showCode />
  if (languagesResult.error)
    return <AppError error={languagesResult.error} variant="banner" showCode />

  const profile = profileResult.data
  const manifestRevision =
    manifestResult.data?.draft ?? manifestResult.data?.published ?? null
  const resourceSections = catalogResult.data.resource_types.map(
    (definition) => {
      const resourceType = definition.resource_type

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
