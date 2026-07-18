import type { OutputBlockData, OutputData } from '@editorjs/editorjs'

export type NoteEditorData = OutputData

const EMPTY_NOTE_DATA: NoteEditorData = {
  blocks: [{ type: 'paragraph', data: { text: '' } }],
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function isEditorData(value: unknown): value is NoteEditorData {
  return (
    !!value &&
    typeof value === 'object' &&
    Array.isArray((value as NoteEditorData).blocks)
  )
}

function listItemText(item: unknown): string {
  if (typeof item === 'string') return stripHtml(item)
  if (!item || typeof item !== 'object') return ''
  const record = item as Record<string, unknown>
  if (typeof record.content === 'string') return stripHtml(record.content)
  if (typeof record.text === 'string') return stripHtml(record.text)
  return ''
}

function blockPlainText(block: OutputBlockData): string {
  const data = (block.data ?? {}) as Record<string, unknown>
  switch (block.type) {
    case 'header':
    case 'paragraph':
      return typeof data.text === 'string' ? stripHtml(data.text) : ''
    case 'list': {
      const items = Array.isArray(data.items) ? data.items : []
      return items.map(listItemText).filter(Boolean).join(' ')
    }
    case 'checklist': {
      const items = Array.isArray(data.items) ? data.items : []
      return items
        .map((item) => {
          if (!item || typeof item !== 'object') return ''
          const text = (item as { text?: unknown }).text
          return typeof text === 'string' ? stripHtml(text) : ''
        })
        .filter(Boolean)
        .join(' ')
    }
    case 'quote':
      return typeof data.text === 'string' ? stripHtml(data.text) : ''
    default:
      return typeof data.text === 'string' ? stripHtml(data.text) : ''
  }
}

/** Parse stored note body (Editor.js JSON or legacy plain text) into Editor.js data. */
export function parseNoteBody(body: string): NoteEditorData {
  const trimmed = body.trim()
  if (!trimmed) return structuredClone(EMPTY_NOTE_DATA)

  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (isEditorData(parsed)) {
      if (parsed.blocks.length === 0) return structuredClone(EMPTY_NOTE_DATA)
      return parsed
    }
  } catch {
    // Legacy plain-text body from before Editor.js.
  }

  const paragraphs = trimmed.split(/\n{2,}/)
  return {
    blocks: paragraphs.map((paragraph) => ({
      type: 'paragraph',
      data: {
        text: escapeHtml(paragraph).replace(/\n/g, '<br>'),
      },
    })),
  }
}

/** Serialize Editor.js output for Convex `notes.body` (string column). */
export function serializeNoteBody(data: NoteEditorData): string {
  const blocks = Array.isArray(data.blocks) ? data.blocks : []
  const payload: NoteEditorData = {
    time: data.time ?? Date.now(),
    blocks,
    version: data.version,
  }
  return JSON.stringify(payload)
}

export function getNotePlainText(body: string): string {
  return parseNoteBody(body)
    .blocks.map(blockPlainText)
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isNoteBodyEmpty(body: string): boolean {
  return getNotePlainText(body).length === 0
}

export function emptyNoteBody(): string {
  return serializeNoteBody(structuredClone(EMPTY_NOTE_DATA))
}
