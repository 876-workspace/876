import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { $876 } from '@/lib/876'
import { resolveApp } from '../_data'
import { ApiKeysTable } from './api-keys-table'
import { CreateApiKeyDialog } from './create-api-key-dialog'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ after?: string; before?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'API Keys' }
  return { title: `${app.name} • API Keys - Apps` }
}

export default async function AppApiKeysPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { after, before } = await searchParams

  const app = await resolveApp(slug)
  if (!app) notFound()

  const { data } = await $876.apiKeys.list(app.id, {
    limit: 25,
    starting_after: after,
    ending_before: before,
  })
  const keys = data?.data ?? []
  const hasMore = data?.has_more ?? false

  return (
    <div className="space-y-5">
      <div className="mb-4">
        <h2 className="876-page-title text-foreground">API Keys</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage API keys to authenticate server requests.
        </p>
      </div>

      <ApiKeysTable
        appId={app.id}
        data={keys}
        hasMore={hasMore}
        firstId={keys[0]?.id ?? null}
        lastId={keys[keys.length - 1]?.id ?? null}
        toolbarAction={<CreateApiKeyDialog appId={app.id} />}
      />
    </div>
  )
}
