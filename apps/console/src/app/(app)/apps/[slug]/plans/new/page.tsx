import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Skeleton } from '@876/ui/skeleton'

import { $876 } from '@/lib/876'
import { resolveApp } from '../../_data'
import { CreatePlanForm } from './_components/create-plan-form'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'New Plan' }
  return { title: `New Plan • ${app.name} - Apps` }
}

export default function NewPlanPage({ params }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="876-page-title">New Plan</h1>
      </div>

      <Suspense fallback={<NewPlanFormFallback />}>
        <NewPlanFormData params={params} />
      </Suspense>
    </div>
  )
}

async function NewPlanFormData({ params }: Props) {
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

  return <CreatePlanForm appId={app.id} appSlug={app.slug} modules={modules} />
}

function NewPlanFormFallback() {
  return (
    <div className="876-card space-y-5 p-5">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  )
}
