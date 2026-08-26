import { z } from 'zod'

export interface ClientError {
  code: string
  message: string
}

export type Result<T> =
  | { data: T; error: null }
  | { data: null; error: ClientError }

export interface ClientOptions {
  baseUrl?: string
  internalKey?: string
  fetch?: typeof fetch
  requestId?: string
}

export interface RequestOptions {
  signal?: AbortSignal
}

export const customerProfileStatusSchema = z.enum(['ACTIVE', 'INACTIVE'])

export const registryCustomerSchema = z
  .object({
    id: z.string(),
    customerType: z.enum(['EXTERNAL', 'CORE_USER', 'CORE_ORGANIZATION']),
    customerKind: z.enum(['INDIVIDUAL', 'BUSINESS']),
    name: z.string(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    companyName: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
  })
  .passthrough()

export const customerProfileSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  billingCustomerId: z.string(),
  ownerId: z.string().nullable(),
  status: customerProfileStatusSchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  deletedAt: z.number().int().nullable(),
  deletedBy: z.string().nullable(),
  deletionReason: z.string().nullable(),
})

export const customerSchema = z.object({
  object: z.literal('customer_profile'),
  profile: customerProfileSchema,
  customer: registryCustomerSchema.nullable(),
})

export const customerListSchema = z.object({
  object: z.literal('list'),
  data: z.array(customerSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})

export type CustomerProfileStatus = z.infer<typeof customerProfileStatusSchema>
export type RegistryCustomer = z.infer<typeof registryCustomerSchema>
export type CustomerProfile = z.infer<typeof customerProfileSchema>
export type Customer = z.infer<typeof customerSchema>
export type CustomerList = z.infer<typeof customerListSchema>

export interface CreateCustomerInput {
  idempotencyKey: string
  customerKind: 'INDIVIDUAL' | 'BUSINESS'
  firstName?: string | null
  lastName?: string | null
  companyName?: string | null
  email?: string | null
  phone?: string | null
  ownerId?: string | null
}

export interface UpdateCustomerInput {
  customerKind: 'INDIVIDUAL' | 'BUSINESS'
  firstName?: string | null
  lastName?: string | null
  companyName?: string | null
  email?: string | null
  phone?: string | null
  ownerId?: string | null
  status?: CustomerProfileStatus
}

export const requestStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'WAITING',
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
])
export const requestPrioritySchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
export const requestCategorySchema = z.enum([
  'GENERAL',
  'SUPPORT',
  'BILLING',
  'SALES',
  'COMPLAINT',
  'FEEDBACK',
  'OTHER',
])
export const requestSourceSchema = z.enum([
  'CRM',
  'EMAIL',
  'PHONE',
  'CHAT',
  'WEB',
  'API',
  'OTHER',
])

export const crmRequestSchema = z.object({
  object: z.literal('request'),
  id: z.string(),
  tenantId: z.string(),
  customerId: z.string(),
  number: z.number().int().positive(),
  subject: z.string(),
  description: z.string().nullable(),
  category: requestCategorySchema,
  status: requestStatusSchema,
  priority: requestPrioritySchema,
  source: requestSourceSchema,
  assigneeId: z.string().nullable(),
  createdBy: z.string(),
  resolvedAt: z.number().int().nullable(),
  closedAt: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const requestListSchema = z.object({
  object: z.literal('list'),
  data: z.array(crmRequestSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})

export type RequestStatus = z.infer<typeof requestStatusSchema>
export type RequestPriority = z.infer<typeof requestPrioritySchema>
export type RequestCategory = z.infer<typeof requestCategorySchema>
export type RequestSource = z.infer<typeof requestSourceSchema>
export type CrmRequest = z.infer<typeof crmRequestSchema>
export type RequestList = z.infer<typeof requestListSchema>

export interface CreateRequestInput {
  customerId: string
  subject: string
  description?: string | null
  category?: RequestCategory
  priority?: RequestPriority
  source?: RequestSource
  assigneeId?: string | null
  createdBy: string
}

export interface UpdateRequestInput {
  subject?: string
  description?: string | null
  category?: RequestCategory
  status?: RequestStatus
  priority?: RequestPriority
  source?: RequestSource
  assigneeId?: string | null
}

export interface DeleteInput {
  deletedBy: string
  reason?: string | null
}

export const deletedSchema = z.object({
  object: z.string(),
  id: z.string(),
  deleted: z.literal(true),
})

export type Deleted = z.infer<typeof deletedSchema>
