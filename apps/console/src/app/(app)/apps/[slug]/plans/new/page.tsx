import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { $876 } from '@/lib/876'
import { resolveApp } from '../../_data'
import { CreatePlanForm } from './create-plan-form'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'New Plan' }
  return { title: `New Plan • ${app.name} - Apps` }
}

export default async function NewPlanPage({ params }: Props) {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) notFound()

  const { data: moduleList } = await $876.modules.list(app.id)
  const modules = (moduleList?.data ?? []).map((module) => ({
    id: module.id,
    key: module.key,
    name: module.name,
    description: module.description,
    featureSlug: module.feature_slug,
    status: module.status,
  }))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="876-page-title">New Plan</h1>
      </div>

      <CreatePlanForm appId={app.id} appSlug={app.slug} modules={modules} />
    </div>
  )
}
