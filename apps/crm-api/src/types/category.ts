export interface CreateCategoryInput {
  name: string
  description?: string | null
  color?: string | null
  icon?: string | null
  sortOrder?: number
  isActive?: boolean
  defaultTeamId?: string | null
  defaultPriorityId?: string | null
  createdBy: string
}

export type UpdateCategoryInput = Partial<
  Omit<CreateCategoryInput, 'createdBy'>
>

export interface DeleteCategoryInput {
  deletedBy: string
  reason?: string
}

export interface RequestCategory {
  object: 'request_category'
  id: string
  tenantId: string
  provisioningKey: string | null
  name: string
  slug: string
  description: string | null
  color: string | null
  icon: string | null
  sortOrder: number
  isActive: boolean
  defaultTeamId: string | null
  defaultPriorityId: string | null
  createdBy: string | null
  createdAt: number
  updatedAt: number
  subcategories: RequestSubcategory[]
}

export interface RequestSubcategory {
  object: 'request_subcategory'
  id: string
  tenantId: string
  categoryId: string
  provisioningKey: string | null
  name: string
  slug: string
  description: string | null
  icon: string | null
  sortOrder: number
  isActive: boolean
  defaultTeamId: string | null
  defaultPriorityId: string | null
  createdBy: string | null
  createdAt: number
  updatedAt: number
}

export interface ProvisionedCategoryInput {
  provisioningKey: string
  name: string
  description: string | null
  color: string | null
  icon: string | null
  sortOrder: number
  isActive: boolean
  defaultPriorityId: string | null
}

export interface ProvisionedSubcategoryInput extends ProvisionedCategoryInput {
  categoryId: string
}
