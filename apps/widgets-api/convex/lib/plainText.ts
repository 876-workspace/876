/**
 * Extract searchable plain text from an Editor.js body JSON string.
 * Mirrors notepad extraction with extra KB block types.
 */
export function extractPlainText(title: string, body: string): string {
  const parts: string[] = [title.trim()]
  const trimmed = body.trim()
  if (!trimmed) return parts.join(' ').replace(/\s+/g, ' ').trim()

  try {
    const data = JSON.parse(trimmed) as {
      blocks?: Array<{ type?: string; data?: Record<string, unknown> }>
    }
    if (!data?.blocks || !Array.isArray(data.blocks)) {
      parts.push(stripHtml(trimmed))
      return parts.join(' ').replace(/\s+/g, ' ').trim()
    }

    for (const block of data.blocks) {
      const text = blockPlainText(block.type ?? '', block.data ?? {})
      if (text) parts.push(text)
    }
  } catch {
    parts.push(stripHtml(trimmed))
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim()
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

function listItemText(item: unknown): string {
  if (typeof item === 'string') return stripHtml(item)
  if (!item || typeof item !== 'object') return ''
  const record = item as Record<string, unknown>
  if (typeof record.content === 'string') return stripHtml(record.content)
  if (typeof record.text === 'string') return stripHtml(record.text)
  return ''
}

function blockPlainText(type: string, data: Record<string, unknown>): string {
  switch (type) {
    case 'header':
    case 'paragraph':
    case 'quote':
    case 'warning':
      return typeof data.text === 'string'
        ? stripHtml(data.text)
        : typeof data.message === 'string'
          ? stripHtml(data.message)
          : typeof data.title === 'string'
            ? stripHtml(data.title)
            : ''
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
    case 'image': {
      const caption =
        typeof data.caption === 'string'
          ? stripHtml(data.caption)
          : typeof data.file === 'object' &&
              data.file &&
              typeof (data.file as { url?: unknown }).url === 'string'
            ? ''
            : ''
      return caption
    }
    case 'embed':
      return typeof data.caption === 'string' ? stripHtml(data.caption) : ''
    case 'delimiter':
      return ''
    default:
      return typeof data.text === 'string' ? stripHtml(data.text) : ''
  }
}
