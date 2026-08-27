import type { OutputBlockData, OutputData } from '@editorjs/editorjs'

export type EditorContentData = OutputData

const EMPTY_EDITOR_DATA: EditorContentData = {
  blocks: [{ type: 'paragraph', data: { text: '' } }],
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function stripHtml(value: string) {
  return decodeHtml(value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?[^>]+>/g, ' ')
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

function isEditorData(value: unknown): value is EditorContentData {
  return (
    !!value &&
    typeof value === 'object' &&
    Array.isArray((value as EditorContentData).blocks)
  )
}

/**
 * Older Notepad documents used the standalone checklist tool. Editor.js list
 * 2.x owns checklist rows now, so normalize the legacy shape for every host.
 */
function migrateLegacyBlock(block: OutputBlockData): OutputBlockData {
  if (block.type !== 'checklist') return block

  const data = (block.data ?? {}) as Record<string, unknown>
  const items = Array.isArray(data.items) ? data.items : []

  return {
    ...block,
    type: 'list',
    data: {
      style: 'checklist',
      items: items.map((item) => {
        const record =
          item && typeof item === 'object'
            ? (item as Record<string, unknown>)
            : {}

        return {
          content: typeof record.text === 'string' ? record.text : '',
          meta: { checked: record.checked === true },
          items: [],
        }
      }),
    },
  }
}

function listItemText(item: unknown): string {
  if (typeof item === 'string') return stripHtml(item)
  if (!item || typeof item !== 'object') return ''

  const record = item as Record<string, unknown>
  const own =
    typeof record.content === 'string'
      ? stripHtml(record.content)
      : typeof record.text === 'string'
        ? stripHtml(record.text)
        : ''
  const children = Array.isArray(record.items)
    ? record.items.map(listItemText).filter(Boolean).join(' ')
    : ''

  return [own, children].filter(Boolean).join(' ')
}

function blockPlainText(block: OutputBlockData): string {
  const data = (block.data ?? {}) as Record<string, unknown>

  switch (block.type) {
    case 'header':
    case 'paragraph':
    case 'quote':
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
    default:
      return typeof data.text === 'string' ? stripHtml(data.text) : ''
  }
}

/** Parse Editor.js JSON or transparently lift a legacy plain-text value. */
export function parseEditorContent(value: string): EditorContentData {
  const trimmed = value.trim()
  if (!trimmed) return structuredClone(EMPTY_EDITOR_DATA)

  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (isEditorData(parsed)) {
      if (parsed.blocks.length === 0) return structuredClone(EMPTY_EDITOR_DATA)

      return {
        ...parsed,
        blocks: parsed.blocks.map(migrateLegacyBlock),
      }
    }
  } catch {
    // Legacy plain text is intentionally supported at every boundary.
  }

  return {
    blocks: trimmed.split(/\n{2,}/).map((paragraph) => ({
      type: 'paragraph',
      data: {
        text: escapeHtml(paragraph).replace(/\n/g, '<br>'),
      },
    })),
  }
}

/** Serialize Editor.js output for existing string-backed persistence fields. */
export function serializeEditorContent(data: EditorContentData): string {
  const payload: EditorContentData = {
    time: data.time ?? Date.now(),
    blocks: Array.isArray(data.blocks) ? data.blocks : [],
    version: data.version,
  }

  return JSON.stringify(payload)
}

/** Extract searchable/display-safe plain text without exposing Editor.js JSON. */
export function getEditorPlainText(value: string): string {
  return parseEditorContent(value)
    .blocks.map(blockPlainText)
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isEditorContentEmpty(value: string): boolean {
  return getEditorPlainText(value).length === 0
}

export function emptyEditorContent(): string {
  return serializeEditorContent(structuredClone(EMPTY_EDITOR_DATA))
}

/** Compare authored blocks while ignoring Editor.js save metadata. */
export function editorContentEqual(left: string, right: string): boolean {
  return (
    JSON.stringify(parseEditorContent(left).blocks) ===
    JSON.stringify(parseEditorContent(right).blocks)
  )
}
