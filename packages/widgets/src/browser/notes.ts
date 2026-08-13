import type {
  CollectionList,
  DeletedCollection,
  NotepadCollection,
} from '../types/collections'
import type {
  AdminNoteListParams,
  DeletedNote,
  NoteColor,
  NoteCreateParams,
  NoteList,
  NoteListParams,
  NotepadNote,
  NoteWriteParams,
} from '../types/notes'
import {
  toAdminNoteListQuery,
  toNoteBody,
  toNoteListQuery,
} from '../types/notes'

export type BrowserNotesResult<T> =
  | { data: T; error: null }
  | { data: null; error: string; status?: number }

const MEMBER_BASE = '/api/widgets/notepad'
const MEMBER_COLLECTIONS = '/api/widgets/notepad/collections'
const ADMIN_BASE = '/api/widgets/admin/notepad'

function toQueryString(
  query: Record<string, string | number | undefined>
): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue
    params.set(key, String(value))
  }
  const suffix = params.toString()
  return suffix ? `?${suffix}` : ''
}

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
  list(params: NoteListParams = {}) {
    return hostRequest<NoteList>(
      `${MEMBER_BASE}${toQueryString(toNoteListQuery(params))}`
    )
  },

  create(params: NoteCreateParams) {
    return hostRequest<NotepadNote>(MEMBER_BASE, {
      method: 'POST',
      body: JSON.stringify(toNoteBody(params)),
    })
  },

  update(id: string, params: NoteWriteParams) {
    return hostRequest<NotepadNote>(
      `${MEMBER_BASE}/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(toNoteBody(params)),
      }
    )
  },

  delete(id: string) {
    return hostRequest<DeletedNote>(
      `${MEMBER_BASE}/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    )
  },

  listAll(params: AdminNoteListParams = {}) {
    return hostRequest<NoteList>(
      `${ADMIN_BASE}${toQueryString(toAdminNoteListQuery(params))}`
    )
  },

  adminUpdate(id: string, params: NoteWriteParams) {
    return hostRequest<NotepadNote>(`${ADMIN_BASE}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(toNoteBody(params)),
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
