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

export type BrowserNotepadRoutes = {
  notes: string
  collections: string
  adminNotes: string
}

const DEFAULT_BROWSER_NOTEPAD_ROUTES: BrowserNotepadRoutes = {
  notes: '/api/widgets/notepad',
  collections: '/api/widgets/notepad/collections',
  adminNotes: '/api/widgets/admin/notepad',
}

let browserNotepadRoutes = { ...DEFAULT_BROWSER_NOTEPAD_ROUTES }

/**
 * Configures the same-origin routes exposed by the host application.
 *
 * Shared widget components keep using the same browser client while each host
 * is free to present its own public API vocabulary. Unspecified routes retain
 * the package defaults for backwards-compatible hosts.
 */
export function configureBrowserNotepadRoutes(
  routes: Partial<BrowserNotepadRoutes>
): void {
  browserNotepadRoutes = {
    ...DEFAULT_BROWSER_NOTEPAD_ROUTES,
    ...routes,
  }
}

/** Restores the package defaults; intended primarily for isolated tests. */
export function resetBrowserNotepadRoutes(): void {
  browserNotepadRoutes = { ...DEFAULT_BROWSER_NOTEPAD_ROUTES }
}

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
      `${browserNotepadRoutes.notes}${toQueryString(toNoteListQuery(params))}`
    )
  },

  create(params: NoteCreateParams) {
    return hostRequest<NotepadNote>(browserNotepadRoutes.notes, {
      method: 'POST',
      body: JSON.stringify(toNoteBody(params)),
    })
  },

  update(id: string, params: NoteWriteParams) {
    return hostRequest<NotepadNote>(
      `${browserNotepadRoutes.notes}/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(toNoteBody(params)),
      }
    )
  },

  delete(id: string) {
    return hostRequest<DeletedNote>(
      `${browserNotepadRoutes.notes}/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    )
  },

  listAll(params: AdminNoteListParams = {}) {
    return hostRequest<NoteList>(
      `${browserNotepadRoutes.adminNotes}${toQueryString(toAdminNoteListQuery(params))}`
    )
  },

  adminUpdate(id: string, params: NoteWriteParams) {
    return hostRequest<NotepadNote>(
      `${browserNotepadRoutes.adminNotes}/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(toNoteBody(params)),
      }
    )
  },

  adminDelete(id: string) {
    return hostRequest<DeletedNote>(
      `${browserNotepadRoutes.adminNotes}/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    )
  },
}

/** Browser client for host same-origin Notepad collection routes. */
export const browserCollections = {
  list() {
    return hostRequest<CollectionList>(browserNotepadRoutes.collections)
  },

  create(params: { name: string; color?: NoteColor | null }) {
    return hostRequest<NotepadCollection>(browserNotepadRoutes.collections, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  update(id: string, params: { name?: string; color?: NoteColor | null }) {
    return hostRequest<NotepadCollection>(
      `${browserNotepadRoutes.collections}/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(params),
      }
    )
  },

  delete(id: string) {
    return hostRequest<DeletedCollection>(
      `${browserNotepadRoutes.collections}/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    )
  },
}
