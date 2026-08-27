import type { z } from 'zod'

import type {
  create,
  deletion,
  update,
} from '../modules/categories/categories.schemas.js'

export type CreateCategoryInput = z.infer<typeof create>
export type UpdateCategoryInput = z.infer<typeof update>
export type DeleteCategoryInput = z.infer<typeof deletion>

export interface RequestCategory {
  object: 'request_category'
  id: string
  tenantId: string
  name: string
  slug: string
  icon: string | null
  isActive: boolean
  subcategories: RequestSubcategory[]
}
export interface RequestSubcategory {
  object: 'request_subcategory'
  id: string
  tenantId: string
  categoryId: string
  name: string
  slug: string
  icon: string | null
  isActive: boolean
}
