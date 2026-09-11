import { workspace } from '@/lib/services/workspace'
import type { Metadata } from 'next'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
} from '@876/ui/detail-card'

import {
  CreateFeatureForm,
  type CreateFeatureFormSetup,
} from '@/features/access/components/create-feature-form'
import { resolveApp } from '../../_data'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ parent?: string }>
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
  const [{ slug }, { parent }] = await Promise.all([params, searchParams])
  const setup = loadAppFeatureSetup(slug, parent)

  return (
    <DetailCard aria-label="New feature">
      <DetailCardHeader
        title="New Feature"
        closeHref={`/apps/${slug}/features`}
        closeLabel="Close new feature"
      />
      <DetailCardBody>
        <CreateFeatureForm
          setup={setup}
          lockAppHint
          returnHref={`/apps/${slug}/features`}
        />
      </DetailCardBody>
    </DetailCard>
  )
}

async function loadAppFeatureSetup(
  slug: string,
  parent?: string
): Promise<CreateFeatureFormSetup> {
  const [app, parentResult] = await Promise.all([
    resolveApp(slug),
    parent
      ? workspace.features.retrieve(parent)
      : Promise.resolve({ data: null, error: null }),
  ])
  if (!app) throw new Error('App not found.')
  if (parentResult.error) throw new Error(parentResult.error.message)

  const parentFeature = parentResult.data
  if (parentFeature && parentFeature.app_id !== app.id)
    throw new Error('The parent feature does not belong to this app.')

  return {
    apps: [app],
    defaultAppId: app.id,
    defaultDescription: parentFeature
      ? `Controls access to a ${parentFeature.name.toLowerCase()} capability.`
      : '',
    defaultSlug: parentFeature ? `${parentFeature.slug}_` : '',
    parentFeatureId: parentFeature?.id ?? null,
    parentFeatureName: parentFeature?.name ?? null,
    lockApp: true,
  }
}
