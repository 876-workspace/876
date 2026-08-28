export interface RequestPriority {
  object: 'request_priority'
  id: string
  tenantId: string
  provisioningKey: string | null
  name: string
  slug: string
  description: string | null
  color: string | null
  icon: string | null
  weight: number
  sortOrder: number
  isDefault: boolean
  isActive: boolean
  createdBy: string | null
  createdAt: number
  updatedAt: number
}

export interface CreateRequestPriorityInput {
  name: string
  description?: string | null
  color?: string | null
  icon?: string | null
  weight?: number
  sortOrder?: number
  isDefault?: boolean
  isActive?: boolean
  createdBy: string
}

export type UpdateRequestPriorityInput = Partial<
  Omit<CreateRequestPriorityInput, 'createdBy'>
>

export interface DeleteRequestPriorityInput {
  deletedBy: string
}

export interface ProvisionedRequestPriorityInput {
  provisioningKey: string
  name: string
  description: string | null
  color: string | null
  icon: string | null
  weight: number
  sortOrder: number
  isDefault: boolean
}
