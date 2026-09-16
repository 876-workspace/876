import { z } from 'zod'

export const ganttParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
})

function parseIncludeSubItems(value: unknown): boolean {
  if (value === undefined) return true
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === '1') return true
    if (normalized === 'false' || normalized === '0') return false
  }
  return true
}

export const ganttQuerySchema = z.strictObject({
  zoom: z.enum(['day', 'week', 'month']).optional().default('week'),
  includeSubItems: z.unknown().optional().default(true),
})

export type GanttQuery = {
  zoom: 'day' | 'week' | 'month'
  includeSubItems: boolean
}

export function parseGanttQuery(input: {
  zoom?: unknown
  includeSubItems?: unknown
}): GanttQuery {
  const parsed = ganttQuerySchema.parse(input)
  const zoom = parsed.zoom ?? 'week'
  return {
    zoom,
    includeSubItems: parseIncludeSubItems(parsed.includeSubItems),
  }
}
