import Link from 'next/link'
import { ChevronRightIcon } from '@876/ui/icons'
import { Page, PageDescription, PageHeader, PageTitle } from '@876/ui/page'

import { $876 } from '@/lib/876'
import { FEATURE_GROUPS } from '@/lib/feature-groups'
import { CreateFeatureForm } from '../create-feature-form'

export const metadata = { title: 'New Feature' }

const APP_KINDS = ['internal', 'platform', 'product'] as const

type Props = {
  searchParams: Promise<{ group?: string }>
}

export default async function NewFeaturePage({ searchParams }: Props) {
  const { group } = await searchParams
  const results = await Promise.all(
    APP_KINDS.map((appKind) =>
      $876.apps.list({
        limit: 100,
        appKind,
        clientType: 'public',
        status: 'active',
      })
    )
  )
  const apps = results
    .flatMap((result) => result.data?.data ?? [])
    .sort((a, b) => a.name.localeCompare(b.name))
  const featureGroup = FEATURE_GROUPS.find((entry) => entry.id === group)
  const parentFeature = featureGroup
    ? (
        await $876.features.list({
          limit: 100,
          search: featureGroup.masterSlug,
        })
      ).data?.data.find((feature) => feature.slug === featureGroup.masterSlug)
    : null

  return (
    <Page>
      <nav className="mb-5 flex items-center gap-1.5 text-sm">
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
        defaultDescription={
          featureGroup
            ? `Controls access to a ${featureGroup.title.toLowerCase()} capability.`
            : ''
        }
        defaultSlug={featureGroup?.childSlugPrefix ?? ''}
        parentFeatureId={parentFeature?.id ?? null}
      />
    </Page>
  )
}
