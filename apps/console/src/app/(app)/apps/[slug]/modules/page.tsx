import { notFound } from 'next/navigation'

import { $876 } from '@/lib/876'
import { resolveApp } from '../_data'
import { ModulesManager } from './modules-manager'

type Props = { params: Promise<{ slug: string }> }

export default async function AppModulesPage({ params }: Props) {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app || app.app_kind !== 'product') notFound()

  const [modulesResult, featuresResult] = await Promise.all([
    $876.modules.list(app.id, { includeArchived: true }),
    $876.features.list({ appId: app.id, rootOnly: true, limit: 100 }),
  ])
  if (modulesResult.error) throw new Error(modulesResult.error.message)
  if (featuresResult.error) throw new Error(featuresResult.error.message)

  return (
    <ModulesManager
      appId={app.id}
      initialModules={modulesResult.data?.data ?? []}
      features={(featuresResult.data?.data ?? []).map((feature) => ({
        id: feature.id,
        name: feature.name,
        slug: feature.slug,
      }))}
    />
  )
}
