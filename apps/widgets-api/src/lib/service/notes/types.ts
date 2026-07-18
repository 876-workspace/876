export const NOTE_COLORS = [
  'yellow',
  'pink',
  'blue',
  'green',
  'purple',
  'gray',
] as const

export type NoteColor = (typeof NOTE_COLORS)[number]

export const MAX_TITLE_LENGTH = 160
export const MAX_BODY_LENGTH = 100_000

export type NotepadNoteResource = {
  object: 'note'
  id: string
  owner_account_id: string
  title: string
  body: string
  color: NoteColor | null
  pinned: boolean
  created_at: number
  updated_at: number
}

export type NoteList = {
  object: 'list'
  data: NotepadNoteResource[]
  has_more: boolean
  url: string
  total_count: number | null
}

export type DeletedNote = {
  object: 'note'
  id: string
  deleted: true
}
