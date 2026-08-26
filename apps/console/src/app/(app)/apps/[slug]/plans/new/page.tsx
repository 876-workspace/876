import type { Metadata } from 'next'

import { workspace } from '@/lib/876'
import { resolveApp } from '../../_data'
import {
  CreatePlanForm,
  type CreatePlanSetup,
} from './_components/create-plan-form'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'New Plan' }
  return { title: `New Plan • ${app.name} - Apps` }
}

export default async function NewPlanPage({ params }: Props) {
  const { slug } = await params
  const setup = loadPlanSetup(slug)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="876-page-title">New Plan</h1>
      </div>

      <CreatePlanForm appSlug={slug} setup={setup} />
    </div>
  )
}

async function loadPlanSetup(slug: string): Promise<CreatePlanSetup> {
  const app = await resolveApp(slug)
  if (!app) throw new Error('App not found.')

  const result = await workspace.modules.list(app.id)
  if (result.error) throw new Error(result.error.message)

  return {
    appId: app.id,
    modules: (result.data?.data ?? []).map((module) => ({
      id: module.id,
      key: module.key,
      name: module.name,
      description: module.description,
      featureSlug: module.feature_slug,
      status: module.status,
    })),
  }
}
