import { z } from 'zod'

export interface ClientError {
  code: string
  message: string
}

export type Result<T> =
  { data: T; error: null } | { data: null; error: ClientError }

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
    organizationId: z.string().nullable().optional(),
    userId: z.string().nullable().optional(),
    primaryContact: z
      .object({
        object: z.literal('contact'),
        id: z.string(),
        userId: z.string().nullable(),
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        email: z.string().nullable(),
        workPhone: z.string().nullable(),
        mobilePhone: z.string().nullable(),
        avatar: z.string().nullable().optional(),
        isPrimary: z.boolean(),
      })
      .nullable()
      .optional(),
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
  /**
   * Links this customer to an 876 account, making it a `CORE_USER` customer.
   * Only valid with `customerKind: 'INDIVIDUAL'`.
   */
  userId?: string | null
  /**
   * Links this customer to an 876 organization, making it a
   * `CORE_ORGANIZATION` customer. Only valid with `customerKind: 'BUSINESS'`.
   */
  organizationId?: string | null
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
export const requestSourceSchema = z.enum([
  'CRM',
  'EMAIL',
  'PHONE',
  'CHAT',
  'WEB',
  'API',
  'OTHER',
])
export const requestNoteKindSchema = z.enum(['DESCRIPTION', 'NOTE', 'EMAIL'])

export const crmRequestSchema = z.object({
  object: z.literal('request'),
  id: z.string(),
  tenantId: z.string(),
  customerId: z.string(),
  number: z.number().int().positive(),
  subject: z.string(),
  categoryId: z.string().nullable(),
  subcategoryId: z.string().nullable(),
  status: requestStatusSchema,
  priority: requestPrioritySchema,
  source: requestSourceSchema,
  teamId: z.string().nullable(),
  assigneeId: z.string().nullable(),
  ownerId: z.string().nullable(),
  /** The 876 account that raised this, when a named person did. */
  requesterUserId: z.string().nullable(),
  /** The registry contact that raised this, when one is known. */
  requesterContactId: z.string().nullable(),
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
export type RequestSource = z.infer<typeof requestSourceSchema>
export type RequestNoteKind = z.infer<typeof requestNoteKindSchema>
export type CrmRequest = z.infer<typeof crmRequestSchema>
export type RequestList = z.infer<typeof requestListSchema>

export interface ListRequestsQuery {
  status?: RequestStatus
  teamId?: string
  assigneeId?: string
  customerId?: string
  categoryId?: string
  subcategoryId?: string
  ownerId?: string
  /** `'unassigned'` selects requests raised for the organization as a whole. */
  requesterUserId?: string
  priority?: RequestPriority
}

export interface CreateRequestInput {
  customerId: string
  subject: string
  /** The opening message. The service stores it as the request's DESCRIPTION note. */
  description?: string | null
  categoryId?: string | null
  subcategoryId?: string | null
  ownerId?: string | null
  priority?: RequestPriority
  source?: RequestSource
  teamId?: string | null
  assigneeId?: string | null
  requesterUserId?: string | null
  requesterContactId?: string | null
  createdBy: string
}

export interface UpdateRequestInput {
  subject?: string
  categoryId?: string | null
  subcategoryId?: string | null
  ownerId?: string | null
  status?: RequestStatus
  priority?: RequestPriority
  source?: RequestSource
  teamId?: string | null
  assigneeId?: string | null
  requesterUserId?: string | null
  requesterContactId?: string | null
}

export interface DeleteInput {
  deletedBy: string
  reason?: string | null
}

export const crmRequestNoteSchema = z.object({
  object: z.literal('request_note'),
  id: z.string(),
  tenantId: z.string(),
  requestId: z.string(),
  body: z.string(),
  authorId: z.string(),
  internal: z.boolean(),
  kind: requestNoteKindSchema,
  emailMessageId: z.string().nullable().optional(),
  emailDirection: z.enum(['INBOUND', 'OUTBOUND']).nullable().optional(),
  emailFrom: z.string().nullable().optional(),
  emailTo: z.array(z.string()).optional(),
  emailCc: z.array(z.string()).optional(),
  emailSubject: z.string().nullable().optional(),
  editedAt: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const requestNoteListSchema = z.object({
  object: z.literal('list'),
  data: z.array(crmRequestNoteSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})

export type CrmRequestNote = z.infer<typeof crmRequestNoteSchema>
export type RequestNoteList = z.infer<typeof requestNoteListSchema>

export interface CreateRequestNoteInput {
  body: string
  authorId: string
  internal?: boolean
}

export interface UpdateRequestNoteInput {
  body: string
  editedBy: string
}

export interface DeleteRequestNoteInput {
  deletedBy: string
}

export const teamStatusSchema = z.enum(['ACTIVE', 'ARCHIVED'])
export type TeamStatus = z.infer<typeof teamStatusSchema>

export const teamAutoAssignSchema = z.enum([
  'NONE',
  'ROUND_ROBIN',
  'LEAST_BUSY',
])
export type TeamAutoAssign = z.infer<typeof teamAutoAssignSchema>

export const teamMemberRoleSchema = z.enum(['LEAD', 'MEMBER'])
export type TeamMemberRole = z.infer<typeof teamMemberRoleSchema>

export const teamMemberSchema = z.object({
  object: z.literal('team_member'),
  id: z.string(),
  tenantId: z.string(),
  teamId: z.string(),
  userId: z.string(),
  role: teamMemberRoleSchema,
  addedBy: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type TeamMember = z.infer<typeof teamMemberSchema>

export const teamSchema = z.object({
  object: z.literal('team'),
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  color: z.string().nullable(),
  isDefault: z.boolean(),
  autoAssign: teamAutoAssignSchema,
  status: teamStatusSchema,
  createdBy: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  members: z.array(teamMemberSchema).optional(),
})
export type Team = z.infer<typeof teamSchema>

export const teamListSchema = z.object({
  object: z.literal('list'),
  data: z.array(teamSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})
export type TeamList = z.infer<typeof teamListSchema>

export const teamMemberListSchema = z.object({
  object: z.literal('list'),
  data: z.array(teamMemberSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})
export type TeamMemberList = z.infer<typeof teamMemberListSchema>

export interface ListTeamsQuery {
  status?: TeamStatus
  includeMembers?: boolean
}

export interface CreateTeamInput {
  name: string
  description?: string | null
  color?: string | null
  isDefault?: boolean
  autoAssign?: TeamAutoAssign
  createdBy: string
  members?: { userId: string; role?: TeamMemberRole }[]
}

export interface UpdateTeamInput {
  name?: string
  description?: string | null
  color?: string | null
  isDefault?: boolean
  autoAssign?: TeamAutoAssign
  status?: TeamStatus
}

export interface DeleteTeamInput {
  deletedBy: string
  reason?: string
}

export interface AddTeamMemberInput {
  userId: string
  role?: TeamMemberRole
  addedBy: string
}

export interface UpdateTeamMemberInput {
  role: TeamMemberRole
}

export const requestSubcategorySchema = z.object({
  object: z.literal('request_subcategory'),
  id: z.string(),
  tenantId: z.string(),
  categoryId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  defaultTeamId: z.string().nullable(),
  defaultPriority: requestPrioritySchema.nullable(),
  createdBy: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  deletedAt: z.null(),
  deletedBy: z.null(),
})
export type RequestSubcategory = z.infer<typeof requestSubcategorySchema>

export const requestCategorySchema = z.object({
  object: z.literal('request_category'),
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  defaultTeamId: z.string().nullable(),
  defaultPriority: requestPrioritySchema.nullable(),
  createdBy: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  deletedAt: z.null(),
  deletedBy: z.null(),
  subcategories: z.array(requestSubcategorySchema),
})
export type RequestCategory = z.infer<typeof requestCategorySchema>

export const requestCategoryListSchema = z.object({
  object: z.literal('list'),
  data: z.array(requestCategorySchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})
export type RequestCategoryList = z.infer<typeof requestCategoryListSchema>

export interface CreateRequestCategoryInput {
  name: string
  description?: string | null
  color?: string | null
  icon?: string | null
  sortOrder?: number
  isActive?: boolean
  defaultTeamId?: string | null
  defaultPriority?: RequestPriority | null
  createdBy: string
}

export type UpdateRequestCategoryInput = Partial<
  Omit<CreateRequestCategoryInput, 'createdBy'>
>

export type CreateRequestSubcategoryInput = CreateRequestCategoryInput
export type UpdateRequestSubcategoryInput = UpdateRequestCategoryInput

export interface DeleteRequestCategoryInput {
  deletedBy: string
  reason?: string
}

export const taskStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'DONE',
  'CANCELLED',
])
export type TaskStatus = z.infer<typeof taskStatusSchema>

export const requestTaskSchema = z.object({
  object: z.literal('request_task'),
  id: z.string(),
  tenantId: z.string(),
  requestId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: taskStatusSchema,
  priority: requestPrioritySchema,
  assigneeId: z.string().nullable(),
  dueAt: z.number().int().nullable(),
  completedAt: z.number().int().nullable(),
  completedBy: z.string().nullable(),
  sortOrder: z.number().int(),
  createdBy: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  deletedAt: z.null(),
  deletedBy: z.null(),
})
export type RequestTask = z.infer<typeof requestTaskSchema>

export const requestTaskListSchema = z.object({
  object: z.literal('list'),
  data: z.array(requestTaskSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})
export type RequestTaskList = z.infer<typeof requestTaskListSchema>

export interface CreateRequestTaskInput {
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: RequestPriority
  assigneeId?: string | null
  /** Unix seconds, matching every other timestamp on the wire. */
  dueAt?: number | null
  sortOrder?: number
  createdBy: string
}

export interface UpdateRequestTaskInput {
  title?: string
  description?: string | null
  status?: TaskStatus
  priority?: RequestPriority
  assigneeId?: string | null
  /** Unix seconds, matching every other timestamp on the wire. */
  dueAt?: number | null
  sortOrder?: number
  completedBy?: string | null
}

export const reminderStatusSchema = z.enum([
  'SCHEDULED',
  'SENT',
  'DISMISSED',
  'CANCELLED',
])
export type ReminderStatus = z.infer<typeof reminderStatusSchema>

export const requestReminderSchema = z.object({
  object: z.literal('request_reminder'),
  id: z.string(),
  tenantId: z.string(),
  requestId: z.string(),
  title: z.string(),
  note: z.string().nullable(),
  remindAt: z.number().int(),
  userId: z.string(),
  status: reminderStatusSchema,
  sentAt: z.number().int().nullable(),
  dismissedAt: z.number().int().nullable(),
  createdBy: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  deletedAt: z.null(),
  deletedBy: z.null(),
})
export type RequestReminder = z.infer<typeof requestReminderSchema>

export const requestReminderListSchema = z.object({
  object: z.literal('list'),
  data: z.array(requestReminderSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})
export type RequestReminderList = z.infer<typeof requestReminderListSchema>

export interface CreateRequestReminderInput {
  title: string
  note?: string | null
  /** Unix seconds, matching every other timestamp on the wire. */
  remindAt: number
  userId: string
  status?: ReminderStatus
  createdBy: string
}

export interface UpdateRequestReminderInput {
  title?: string
  note?: string | null
  /** Unix seconds, matching every other timestamp on the wire. */
  remindAt?: number
  userId?: string
  status?: ReminderStatus
}

export interface DeleteNestedRequestInput {
  deletedBy: string
}

export const deletedSchema = z.object({
  object: z.string(),
  id: z.string(),
  deleted: z.literal(true),
})

export type Deleted = z.infer<typeof deletedSchema>

/**
 * Narrows a customer list to the one linked to a given 876 party.
 *
 * The call already carries the tenant's `organizationId`; these name the party a
 * customer *is*, which is a different organization when asking "is org X a
 * customer in this workspace?".
 */
export interface ListCustomersQuery {
  customerOrganizationId?: string
  customerUserId?: string
}
