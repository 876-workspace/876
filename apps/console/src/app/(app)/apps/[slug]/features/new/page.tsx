import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Info } from '@876/ui/icons'
import { Alert, AlertTitle, AlertDescription } from '@876/ui/alert'

import { $876 } from '@/lib/876'
import { FEATURE_GROUPS } from '@/lib/feature-groups'
import { CreateFeatureForm } from '../../../../features/create-feature-form'
import { resolveApp } from '../../_data'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ group?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'New Feature' }
  return { title: `New Feature • ${app.name} - Apps` }
}

export default async function NewAppFeaturePage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params
  const { group } = await searchParams
  const app = await resolveApp(slug)
  if (!app) notFound()

  const featureGroup = FEATURE_GROUPS.find((entry) => entry.id === group)
  const parentFeature = featureGroup
    ? (
        await $876.apps.features.list(app.id, {
          limit: 100,
        })
      ).data?.data.find((feature) => feature.slug === featureGroup.masterSlug)
    : null
  const title = featureGroup
    ? `New ${featureGroup.title} Feature`
    : 'New Feature'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="876-page-title">{title}</h1>
      </div>

      {featureGroup && (
        <Alert variant="info" className="max-w-2xl">
          <Info />
          <AlertTitle>Child feature</AlertTitle>
          <AlertDescription>
            You are creating a new child feature under{' '}
            <strong>{featureGroup.title}</strong>. It will automatically be
            grouped with its parent in the feature list.
          </AlertDescription>
        </Alert>
      )}

      <CreateFeatureForm
        apps={[app]}
        defaultAppId={app.id}
        defaultDescription={
          featureGroup
            ? `Controls access to a ${featureGroup.title.toLowerCase()} capability.`
            : ''
        }
        defaultSlug={featureGroup?.childSlugPrefix ?? ''}
        parentFeatureId={parentFeature?.id ?? null}
        lockApp
        returnHref={`/apps/${slug}/features`}
      />
    </div>
  )
}
