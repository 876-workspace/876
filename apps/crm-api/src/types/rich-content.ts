import { z } from 'zod'

const MAX_RICH_CONTENT_BYTES = 100_000
const MAX_RICH_CONTENT_BLOCKS = 250

function plainInlineLength(value: string): number {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'").length
}

function editorListItemLength(value: unknown): number {
  if (typeof value === 'string') return plainInlineLength(value)
  if (!value || typeof value !== 'object') return 0

  const item = value as Record<string, unknown>
  const own =
    typeof item.content === 'string'
      ? plainInlineLength(item.content)
      : typeof item.text === 'string'
        ? plainInlineLength(item.text)
        : 0
  const nested = Array.isArray(item.items)
    ? item.items.reduce<number>(
        (total, child) => total + editorListItemLength(child),
        0
      )
    : 0

  return own + nested
}

function richContentStats(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return { textLength: 0, blockCount: 0 }

  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as { blocks?: unknown }).blocks)
    ) {
      const blocks = (parsed as { blocks: unknown[] }).blocks
      const textLength = blocks.reduce<number>((total, block) => {
        if (!block || typeof block !== 'object') return total
        const data = (block as { data?: unknown }).data
        if (!data || typeof data !== 'object') return total

        const record = data as Record<string, unknown>
        if (Array.isArray(record.items))
          return (
            total +
            record.items.reduce<number>(
              (sum, item) => sum + editorListItemLength(item),
              0
            )
          )

        return (
          total +
          (typeof record.text === 'string' ? plainInlineLength(record.text) : 0)
        )
      }, 0)

      return { textLength, blockCount: blocks.length }
    }
  } catch {
    // Legacy plain-text callers remain valid.
  }

  return { textLength: trimmed.length, blockCount: 1 }
}

function validateRichContent(
  value: string,
  maxTextLength: number,
  ctx: z.RefinementCtx
) {
  const { textLength, blockCount } = richContentStats(value)
  if (textLength > maxTextLength)
    ctx.addIssue({
      code: 'custom',
      message: `Rich content exceeds ${maxTextLength} authored characters.`,
    })
  if (blockCount > MAX_RICH_CONTENT_BLOCKS)
    ctx.addIssue({
      code: 'custom',
      message: `Rich content exceeds ${MAX_RICH_CONTENT_BLOCKS} blocks.`,
    })
}

export function richContentSchema(maxTextLength: number) {
  return z
    .string()
    .trim()
    .min(1)
    .max(MAX_RICH_CONTENT_BYTES)
    .superRefine((value, ctx) => validateRichContent(value, maxTextLength, ctx))
}

export function optionalRichContentSchema(maxTextLength: number) {
  return z
    .string()
    .trim()
    .max(MAX_RICH_CONTENT_BYTES)
    .superRefine((value, ctx) => {
      if (value) validateRichContent(value, maxTextLength, ctx)
    })
    .nullable()
    .optional()
}
