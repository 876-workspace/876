import type {
  CollectionList,
  DeletedCollection,
  NotepadCollection,
} from '../types/collections'
import type {
  DeletedNote,
  NoteColor,
  NoteList,
  NotepadNote,
} from '../types/notes'

export type BrowserNotesResult<T> =
  | { data: T; error: null }
  | { data: null; error: string; status?: number }

const MEMBER_BASE = '/api/widgets/notepad'
const MEMBER_COLLECTIONS = '/api/widgets/notepad/collections'
const ADMIN_BASE = '/api/widgets/admin/notepad'

async function hostRequest<T>(
  path: string,
  init?: RequestInit
): Promise<BrowserNotesResult<T>> {
  try {
    const response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        accept: 'application/json',
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
    const payload = (await response.json().catch(() => null)) as {
      data?: T
      error?: { message?: string } | string | null
    } | null

    if (!response.ok) {
      const message =
        typeof payload?.error === 'string'
          ? payload.error
          : (payload?.error?.message ?? `Request failed (${response.status}).`)
      return { data: null, error: message, status: response.status }
    }

    if (!payload || payload.data === undefined || payload.data === null)
      return { data: null, error: 'Invalid response from host.' }

    return { data: payload.data, error: null }
  } catch {
    return { data: null, error: 'Unable to reach the widget service.' }
  }
}

/** Browser client for host same-origin Notepad routes. */
export const browserNotes = {
  list(
    params: {
      limit?: number
      starting_after?: string
      collection_id?: string
      unfiled?: boolean
    } = {}
  ) {
    const query = new URLSearchParams()
    if (params.limit) query.set('limit', String(params.limit))
    if (params.starting_after)
      query.set('starting_after', params.starting_after)
    if (params.collection_id) query.set('collection_id', params.collection_id)
    if (params.unfiled) query.set('unfiled', '1')
    const suffix = query.size ? `?${query}` : ''
    return hostRequest<NoteList>(`${MEMBER_BASE}${suffix}`)
  },

  create(params: {
    title: string
    body: string
    color?: NoteColor
    pinned?: boolean
    collection_id?: string | null
  }) {
    return hostRequest<NotepadNote>(MEMBER_BASE, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  update(
    id: string,
    params: {
      title?: string
      body?: string
      color?: NoteColor
      pinned?: boolean
      collection_id?: string | null
    }
  ) {
    return hostRequest<NotepadNote>(
      `${MEMBER_BASE}/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(params),
      }
    )
  },

  delete(id: string) {
    return hostRequest<DeletedNote>(
      `${MEMBER_BASE}/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    )
  },

  listAll(
    params: {
      owner_account_id?: string
      limit?: number
      starting_after?: string
    } = {}
  ) {
    const query = new URLSearchParams()
    if (params.owner_account_id)
      query.set('owner_account_id', params.owner_account_id)
    if (params.limit) query.set('limit', String(params.limit))
    if (params.starting_after)
      query.set('starting_after', params.starting_after)
    const suffix = query.size ? `?${query}` : ''
    return hostRequest<NoteList>(`${ADMIN_BASE}${suffix}`)
  },

  adminUpdate(
    id: string,
    params: {
      title?: string
      body?: string
      color?: NoteColor
      pinned?: boolean
      collection_id?: string | null
    }
  ) {
    return hostRequest<NotepadNote>(`${ADMIN_BASE}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    })
  },

  adminDelete(id: string) {
    return hostRequest<DeletedNote>(`${ADMIN_BASE}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },
}

/** Browser client for host same-origin Notepad collection routes. */
export const browserCollections = {
  list() {
    return hostRequest<CollectionList>(MEMBER_COLLECTIONS)
  },

  create(params: { name: string; color?: NoteColor | null }) {
    return hostRequest<NotepadCollection>(MEMBER_COLLECTIONS, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  update(id: string, params: { name?: string; color?: NoteColor | null }) {
    return hostRequest<NotepadCollection>(
      `${MEMBER_COLLECTIONS}/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(params),
      }
    )
  },

  delete(id: string) {
    return hostRequest<DeletedCollection>(
      `${MEMBER_COLLECTIONS}/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    )
  },
}
