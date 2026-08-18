import { Suspense } from 'react'
import Link from 'next/link'
import { ChevronRightIcon } from '@876/ui/icons'
import { Page, PageDescription, PageHeader, PageTitle } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'

import { $876 } from '@/lib/876'
import { CreateFeatureForm } from '@/features/access/components/create-feature-form'

export const metadata = { title: 'New Feature' }

const APP_KINDS = ['internal', 'platform', 'product'] as const

type Props = {
  searchParams: Promise<{ parent?: string }>
}

export default function NewFeaturePage({ searchParams }: Props) {
  return (
    <Page>
      <nav className="mb-5 flex items-center gap-1.5 text-[0.8125rem]">
        <Link
          href="/features"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Features
        </Link>
        <ChevronRightIcon className="text-muted-foreground size-4" />
        <span className="font-medium">New Feature</span>
      </nav>

      <PageHeader>
        <PageTitle>New Feature</PageTitle>
        <PageDescription>Create a PostHog-backed feature flag.</PageDescription>
      </PageHeader>

      <Suspense fallback={<CreateFeatureFallback />}>
        <CreateFeatureData searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}

async function CreateFeatureData({ searchParams }: Props) {
  const { parent } = await searchParams
  const [parentResult, ...results] = await Promise.all([
    parent
      ? $876.features.admin.retrieve(parent)
      : Promise.resolve({ data: null }),
    ...APP_KINDS.map((appKind) =>
      $876.apps.admin.list({
        limit: 100,
        appKind,
        clientType: 'public',
        status: 'active',
      })
    ),
  ])
  const apps = results
    .flatMap((result) => result.data?.data ?? [])
    .sort((a, b) => a.name.localeCompare(b.name))
  const parentFeature = parentResult.data

  return (
    <CreateFeatureForm
      apps={apps}
      defaultAppId={parentFeature?.app_id ?? null}
      defaultDescription={
        parentFeature
          ? `Controls access to a ${parentFeature.name.toLowerCase()} capability.`
          : ''
      }
      defaultSlug={parentFeature ? `${parentFeature.slug}_` : ''}
      parentFeatureId={parentFeature?.id ?? null}
      lockApp={Boolean(parentFeature)}
    />
  )
}

function CreateFeatureFallback() {
  return (
    <div className="876-card space-y-5 p-5">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  )
}
