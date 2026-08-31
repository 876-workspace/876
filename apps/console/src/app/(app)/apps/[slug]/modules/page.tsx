import { workspace } from '@/lib/services/workspace'
import { notFound } from 'next/navigation'
import type { AdminApplicationModule } from '@876/platform/compat'

import { resolveApp } from '../_data'
import {
  ModulesManager,
  type ModuleFeatureOption,
  type ModulesContext,
} from './_components/modules-manager'

type Props = { params: Promise<{ slug: string }> }

export default async function AppModulesPage({ params }: Props) {
  const { slug } = await params
  const context = loadModulesContext(slug)
  const modules = loadModules(context)
  const features = loadModuleFeatures(context)

  return (
    <ModulesManager context={context} modules={modules} features={features} />
  )
}

async function loadModulesContext(slug: string): Promise<ModulesContext> {
  const app = await resolveApp(slug)
  if (!app || !['product', 'platform'].includes(app.app_kind)) notFound()

  return { appId: app.id, canManage: app.app_kind === 'product' }
}

async function loadModules(
  context: Promise<ModulesContext>
): Promise<AdminApplicationModule[]> {
  const { appId } = await context
  const result = await workspace.modules.list(appId, { includeArchived: true })
  if (result.error) throw new Error(result.error.message)
  return result.data?.data ?? []
}

async function loadModuleFeatures(
  context: Promise<ModulesContext>
): Promise<ModuleFeatureOption[]> {
  const { appId, canManage } = await context
  if (!canManage) return []

  const result = await workspace.features.list({
    appId,
    rootOnly: true,
    limit: 100,
  })
  if (result.error) throw new Error(result.error.message)

  return (result.data?.data ?? []).map((feature) => ({
    id: feature.id,
    name: feature.name,
    slug: feature.slug,
  }))
}
