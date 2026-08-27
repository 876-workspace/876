import { z } from 'zod'

export const requestStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'WAITING',
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
])

export const requestPrioritySchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])

export const requestSourceSchema = z.enum([
  'CRM',
  'EMAIL',
  'PHONE',
  'CHAT',
  'WEB',
  'API',
  'OTHER',
])

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
        if (Array.isArray(record.items)) {
          return (
            total +
            record.items.reduce<number>(
              (sum, item) => sum + editorListItemLength(item),
              0
            )
          )
        }

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

function richContentSchema(maxTextLength: number) {
  return z
    .string()
    .trim()
    .min(1)
    .max(MAX_RICH_CONTENT_BYTES)
    .superRefine((value, ctx) => {
      const { textLength, blockCount } = richContentStats(value)
      if (textLength > maxTextLength) {
        ctx.addIssue({
          code: 'custom',
          message: `Rich content exceeds ${maxTextLength} authored characters.`,
        })
      }
      if (blockCount > MAX_RICH_CONTENT_BLOCKS) {
        ctx.addIssue({
          code: 'custom',
          message: `Rich content exceeds ${MAX_RICH_CONTENT_BLOCKS} blocks.`,
        })
      }
    })
}

function optionalRichContentSchema(maxTextLength: number) {
  return z
    .string()
    .trim()
    .max(MAX_RICH_CONTENT_BYTES)
    .superRefine((value, ctx) => {
      if (!value) return
      const { textLength, blockCount } = richContentStats(value)
      if (textLength > maxTextLength) {
        ctx.addIssue({
          code: 'custom',
          message: `Rich content exceeds ${maxTextLength} authored characters.`,
        })
      }
      if (blockCount > MAX_RICH_CONTENT_BLOCKS) {
        ctx.addIssue({
          code: 'custom',
          message: `Rich content exceeds ${MAX_RICH_CONTENT_BLOCKS} blocks.`,
        })
      }
    })
    .nullable()
    .optional()
}

/**
 * A timestamp on the wire.
 *
 * Unix **seconds**, never an ISO string and never milliseconds — the platform
 * contract (`.claude/rules/express-api.md`) makes every timestamp seconds in
 * both directions, and these fields serialize that way on the way out. Taking
 * an ISO string on the way in left the same field with two different types
 * depending on which way it was travelling.
 */
const unixSecondsSchema = z.number().int()

export const organizationParamsSchema = z.object({
  organizationId: z.string().trim().min(1),
})

export const requestParamsSchema = organizationParamsSchema.extend({
  id: z.string().min(1),
})

export const listRequestsQuerySchema = z.object({
  status: requestStatusSchema.optional(),
  teamId: z.string().trim().optional(),
  assigneeId: z.string().trim().optional(),
  customerId: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  subcategoryId: z.string().trim().optional(),
  ownerId: z.string().trim().optional(),
  priority: requestPrioritySchema.optional(),
})

export const createRequestBodySchema = z.object({
  customerId: z.string().min(1),
  subject: z.string().trim().min(1).max(240),
  description: optionalRichContentSchema(20_000),
  categoryId: z.string().trim().max(160).nullable().optional(),
  subcategoryId: z.string().trim().max(160).nullable().optional(),
  ownerId: z.string().trim().max(160).nullable().optional(),
  priority: requestPrioritySchema.optional(),
  source: requestSourceSchema.optional(),
  teamId: z.string().trim().max(160).nullable().optional(),
  assigneeId: z.string().trim().max(160).nullable().optional(),
  createdBy: z.string().min(1),
})

export const updateRequestBodySchema = z
  .object({
    subject: z.string().trim().min(1).max(240).optional(),
    categoryId: z.string().trim().max(160).nullable().optional(),
    subcategoryId: z.string().trim().max(160).nullable().optional(),
    ownerId: z.string().trim().max(160).nullable().optional(),
    status: requestStatusSchema.optional(),
    priority: requestPrioritySchema.optional(),
    source: requestSourceSchema.optional(),
    teamId: z.string().trim().max(160).nullable().optional(),
    assigneeId: z.string().trim().max(160).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

export const deleteRequestBodySchema = z.object({
  deletedBy: z.string().min(1),
  reason: z.string().trim().max(300).nullable().optional(),
})

export const requestNoteParamsSchema = requestParamsSchema.extend({
  noteId: z.string().min(1),
})

export const createRequestNoteBodySchema = z.object({
  body: richContentSchema(10_000),
  authorId: z.string().min(1),
  internal: z.boolean().optional(),
})

export const deleteRequestNoteBodySchema = z.object({
  deletedBy: z.string().min(1),
})

export const updateRequestNoteBodySchema = z.object({
  body: richContentSchema(10_000),
  editedBy: z.string().min(1),
})

export const taskParamsSchema = requestParamsSchema.extend({
  taskId: z.string().min(1),
})
export const reminderParamsSchema = requestParamsSchema.extend({
  reminderId: z.string().min(1),
})
export const createTaskBodySchema = z.object({
  title: z.string().trim().min(1).max(240),
  description: optionalRichContentSchema(10_000),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
  priority: requestPrioritySchema.optional(),
  assigneeId: z.string().nullable().optional(),
  dueAt: unixSecondsSchema.nullable().optional(),
  sortOrder: z.number().int().optional(),
  createdBy: z.string().min(1),
})
export const updateTaskBodySchema = createTaskBodySchema
  .omit({ createdBy: true })
  .extend({ completedBy: z.string().nullable().optional() })
  .partial()
  .refine((x) => Object.keys(x).length > 0)
export const createReminderBodySchema = z.object({
  title: z.string().trim().min(1).max(240),
  note: z.string().trim().max(10_000).nullable().optional(),
  remindAt: unixSecondsSchema,
  userId: z.string().min(1),
  status: z.enum(['SCHEDULED', 'SENT', 'DISMISSED', 'CANCELLED']).optional(),
  createdBy: z.string().min(1),
})
export const updateReminderBodySchema = createReminderBodySchema
  .omit({ createdBy: true })
  .partial()
  .refine((x) => Object.keys(x).length > 0)
export const deleteNestedBodySchema = z.object({ deletedBy: z.string().min(1) })
