import Link from 'next/link'
import { ChevronRightIcon } from '@876/ui/icons'
import { Page, PageDescription, PageHeader, PageTitle } from '@876/ui/page'

import { $876 } from '@/lib/876'
import { CreateFeatureForm } from '@/features/access/components/create-feature-form'

export const metadata = { title: 'New Feature' }

const APP_KINDS = ['internal', 'platform', 'product'] as const

type Props = {
  searchParams: Promise<{ parent?: string }>
}

export default async function NewFeaturePage({ searchParams }: Props) {
  const { parent } = await searchParams
  const [parentResult, ...results] = await Promise.all([
    parent ? $876.features.retrieve(parent) : Promise.resolve({ data: null }),
    ...APP_KINDS.map((appKind) =>
      $876.apps.list({
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
    </Page>
  )
}
