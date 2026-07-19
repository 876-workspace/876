import type { OutputBlockData, OutputData } from '@editorjs/editorjs'

export type KnowledgeEditorData = OutputData

const EMPTY: KnowledgeEditorData = {
  blocks: [{ type: 'paragraph', data: { text: '' } }],
}

export function parseKnowledgeBody(body: string): KnowledgeEditorData {
  const trimmed = body.trim()
  if (!trimmed) return structuredClone(EMPTY)

  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as KnowledgeEditorData).blocks)
    )
      return parsed as KnowledgeEditorData
  } catch {
    // legacy plain text
  }

  return {
    blocks: [{ type: 'paragraph', data: { text: escapeHtml(trimmed) } }],
  }
}

export function serializeKnowledgeBody(data: KnowledgeEditorData): string {
  return JSON.stringify({
    time: data.time ?? Date.now(),
    blocks: data.blocks ?? [],
    version: data.version,
  })
}

export function isKnowledgeBodyEmpty(body: string): boolean {
  const data = parseKnowledgeBody(body)
  if (!data.blocks?.length) return true
  return data.blocks.every((block) => !blockPlainText(block).trim())
}

export function getKnowledgePlainText(body: string): string {
  const data = parseKnowledgeBody(body)
  return (data.blocks ?? [])
    .map(blockPlainText)
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
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
    case 'quote':
      return typeof data.text === 'string' ? stripHtml(data.text) : ''
    case 'warning': {
      const title = typeof data.title === 'string' ? stripHtml(data.title) : ''
      const message =
        typeof data.message === 'string' ? stripHtml(data.message) : ''
      return [title, message].filter(Boolean).join(' ')
    }
    case 'list':
    case 'checklist': {
      const items = Array.isArray(data.items) ? data.items : []
      return items.map(listItemText).filter(Boolean).join(' ')
    }
    case 'code':
      return typeof data.code === 'string' ? data.code : ''
    case 'table': {
      const content = Array.isArray(data.content) ? data.content : []
      return content
        .flatMap((row) => (Array.isArray(row) ? row : []))
        .map((cell) => (typeof cell === 'string' ? stripHtml(cell) : ''))
        .filter(Boolean)
        .join(' ')
    }
    case 'image':
      return typeof data.caption === 'string' ? stripHtml(data.caption) : ''
    case 'embed':
      return typeof data.caption === 'string' ? stripHtml(data.caption) : ''
    default:
      return typeof data.text === 'string' ? stripHtml(data.text) : ''
  }
}
