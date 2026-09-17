import { z } from 'zod'

export const templateIncludeSchema = {
  includeWorkItems: z.boolean().optional(),
  includeDependencies: z.boolean().optional(),
  includeBudgets: z.boolean().optional(),
}

export type UpdateTemplateParams = {
  name: string
  description: string | null
}

export type TemplatePreviewQuery = {
  templateId: string
  startDate: number
  include: {
    includeWorkItems: boolean
    includeDependencies: boolean
    includeBudgets: boolean
  }
}

export type TemplatePreviewHrefInput = {
  templateId: string
  start: string
  include: {
    includeWorkItems: boolean
    includeDependencies: boolean
    includeBudgets: boolean
  }
}

export type FromTemplateSearch = {
  templateId?: string
  start?: string
  includeWorkItems?: string
  includeDependencies?: string
  includeBudgets?: string
}
