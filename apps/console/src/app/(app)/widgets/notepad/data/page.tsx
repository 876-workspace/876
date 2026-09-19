import { widgets } from '@/lib/clients/widgets'
import { platform } from '@/lib/clients/platform'
import {
  WIDGET_HOST_APP_SLUGS,
  WIDGET_HOST_LABELS,
  type WidgetHost,
} from '@876/widgets'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

import { NotesSplit, type AdminNoteRow } from './_components/notes-split'

export const metadata = { title: 'Data — Notepad' }

function isWidgetHost(value: string): value is WidgetHost {
  return value in WIDGET_HOST_LABELS
}

type Props = {
  searchParams: Promise<{ owner?: string; note?: string }>
}

export default async function NotepadWidgetDataPage({ searchParams }: Props) {
  const [{ owner, note }, session] = await Promise.all([
    searchParams,
    getAuthSession(),
  ])
  if (!isSignedSession(session)) return null

  const actor = { userId: session.user.id }
  const notesResult = await widgets.notes.list(actor, {
    ownerAccountId: owner || undefined,
    limit: 50,
  })
  const notes = notesResult.data?.data ?? []

  // Notes carry an opaque 876 account ID, never a name — identity lives in the
  // core API. Resolve each distinct owner once rather than per row.
  const ownerIds = [...new Set(notes.map((entry) => entry.owner_account_id))]
  const owners = new Map(
    (
      await Promise.all(
        ownerIds.map(async (id) => {
          const { data } = await platform.users.retrieve({ id })
          return [id, data] as const
        })
      )
    ).filter(([, user]) => user !== null)
  )

  const apps = new Map(
    (
      await platform.apps.list({ limit: 100, clientType: 'public' })
    ).data?.data.map((app) => [app.slug, app.name]) ?? []
  )

  const rows: AdminNoteRow[] = notes.map((entry) => {
    const user = owners.get(entry.owner_account_id)
    const fullName = user
      ? [user.first_name, user.last_name].filter(Boolean).join(' ')
      : ''
    const host =
      entry.source_host && isWidgetHost(entry.source_host)
        ? entry.source_host
        : null

    return {
      id: entry.id,
      title: entry.title,
      body: entry.body,
      color: entry.color,
      pinned: entry.pinned,
      updatedAt: entry.updated_at,
      createdAt: entry.created_at,
      ownerAccountId: entry.owner_account_id,
      ownerName: fullName || user?.username || user?.email || null,
      ownerEmail: user?.email ?? null,
      ownerAvatar: user?.avatar ?? null,
      sourceApp: host
        ? (apps.get(WIDGET_HOST_APP_SLUGS[host]) ?? WIDGET_HOST_LABELS[host])
        : null,
    }
  })

  return (
    <NotesSplit
      rows={rows}
      selectedId={note}
      hasMore={notesResult.data?.has_more ?? false}
      ownerFilter={owner ?? ''}
      loadError={notesResult.error?.message ?? null}
    />
  )
}
