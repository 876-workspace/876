import type { NoteColor } from '../notes/types'

export const MAX_COLLECTION_NAME_LENGTH = 80

export type NotepadCollectionResource = {
  object: 'collection'
  id: string
  owner_account_id: string
  name: string
  color: NoteColor | null
  note_count: number
  created_at: number
  updated_at: number
}

export type CollectionList = {
  object: 'list'
  data: NotepadCollectionResource[]
  has_more: boolean
  url: string
  total_count: number | null
}

export type DeletedCollection = {
  object: 'collection'
  id: string
  deleted: true
}
