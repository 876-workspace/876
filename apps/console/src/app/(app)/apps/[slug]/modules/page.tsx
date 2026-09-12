import { getAppModuleRegistry } from '@876/core/modules'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { listAppModules, listModuleFeatures } from '@/lib/console/modules'
import { resolveApp } from '../_data'
import { ModulesManager } from './_components/modules-manager'
import type {
  ModulesContext,
  ModulesResult,
  ModuleFeaturesResult,
} from '@/types/modules'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'Modules' }
  return { title: `${app.name} Modules` }
}

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

  const registry = getAppModuleRegistry(app.slug)

  return {
    appId: app.id,
    canManage: app.app_kind === 'product',
    registryManaged: registry !== undefined,
    registryModuleKeys: registry?.modules.map((module) => module.key) ?? [],
  }
}

async function loadModules(
  context: Promise<ModulesContext>
): Promise<ModulesResult> {
  const { appId } = await context
  const result = await listAppModules(appId, true)
  if (result.error) return { data: null, error: result.error }
  return { data: result.data.data, error: null }
}

async function loadModuleFeatures(
  context: Promise<ModulesContext>
): Promise<ModuleFeaturesResult> {
  const { appId, canManage } = await context
  if (!canManage) return { data: [], error: null }
  return listModuleFeatures(appId)
}
