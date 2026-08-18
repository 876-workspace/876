import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Info } from '@876/ui/icons'
import { Alert, AlertTitle, AlertDescription } from '@876/ui/alert'
import { Skeleton } from '@876/ui/skeleton'

import { $876 } from '@/lib/876'
import { CreateFeatureForm } from '@/features/access/components/create-feature-form'
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

export default function NewAppFeaturePage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<NewAppFeatureFallback />}>
      <NewAppFeatureData params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function NewAppFeatureData({ params, searchParams }: Props) {
  const [{ slug }, { parent }] = await Promise.all([params, searchParams])
  const app = await resolveApp(slug)
  if (!app) notFound()

  const parentFeature = parent
    ? (await $876.features.admin.retrieve(parent)).data
    : null
  if (parentFeature && parentFeature.app_id !== app.id) notFound()

  const title = parentFeature
    ? `New ${parentFeature.name} child feature`
    : 'New Feature'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="876-page-title">{title}</h1>
      </div>

      {parentFeature && (
        <Alert variant="info" className="max-w-2xl">
          <Info />
          <AlertTitle>Child feature</AlertTitle>
          <AlertDescription>
            You are creating a new child feature under{' '}
            <strong>{parentFeature.name}</strong>. It will automatically be
            grouped with its parent in the feature list.
          </AlertDescription>
        </Alert>
      )}

      <CreateFeatureForm
        apps={[app]}
        defaultAppId={app.id}
        defaultDescription={
          parentFeature
            ? `Controls access to a ${parentFeature.name.toLowerCase()} capability.`
            : ''
        }
        defaultSlug={parentFeature ? `${parentFeature.slug}_` : ''}
        parentFeatureId={parentFeature?.id ?? null}
        lockApp
        returnHref={`/apps/${slug}/features`}
      />
    </div>
  )
}

function NewAppFeatureFallback() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-48" />
      <div className="876-card space-y-5 p-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
