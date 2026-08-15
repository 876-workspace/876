import * as z from 'zod'

const optionalNullableString = z.string().nullable().optional()
const metadataSchema = z.record(z.string(), z.unknown()).nullable().optional()

function apiListSchema<TItem>(itemSchema: z.ZodType<TItem>) {
  return z.strictObject({
    object: z.literal('list'),
    data: z.array(itemSchema),
    hasMore: z.boolean(),
    totalCount: z.number().nullable().optional(),
    url: z.string(),
  })
}

function deletedObjectSchema<TObject extends string>(object: TObject) {
  return z.strictObject({
    object: z.literal(object),
    id: z.string(),
    deleted: z.literal(true),
  })
}

// ── Organization (self-scoped details) ───────────────────────────────────────

export const sdk876OrganizationSchema = z.strictObject({
  object: z.literal('organization'),
  id: z.string(),
  workosOrganizationId: z.string().nullable(),
  name: z.string().nullable(),
  shortName: z.string().nullable(),
  doingBusinessAs: z.string().nullable(),
  slug: z.string(),
  status: z.string(),
  logoUrl: z.string().nullable(),
  industry: z.string().nullable(),
  businessType: z.string().nullable(),
  registrationNumber: z.string().nullable(),
  trn: z.string().nullable(),
  nisNumber: z.string().nullable(),
  gctNumber: z.string().nullable(),
  taxId: z.string().nullable(),
  incorporationDate: z.string().nullable(),
  primaryPhone: z.string().nullable(),
  primaryEmail: z.string().nullable(),
  fax: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  supportUrl: z.string().nullable(),
  primaryContactUserId: z.string().nullable(),
  timezone: z.string().nullable(),
  language: z.string().nullable(),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  city: z.string().nullable(),
  regionId: z.string().nullable(),
  countryCode: z.string().nullable(),
  currencyCode: z.string().nullable(),
  enrollmentCompletedAt: z.number().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  deletedAt: z.number().nullable(),
  deletedBy: z.string().nullable(),
  deletionReason: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const sdk876OrganizationSelfUpdateParamsSchema = z.strictObject({
  name: optionalNullableString,
  shortName: optionalNullableString,
  doingBusinessAs: optionalNullableString,
  logoUrl: optionalNullableString,
  industry: optionalNullableString,
  businessType: optionalNullableString,
  registrationNumber: optionalNullableString,
  trn: optionalNullableString,
  nisNumber: optionalNullableString,
  gctNumber: optionalNullableString,
  taxId: optionalNullableString,
  incorporationDate: optionalNullableString,
  primaryPhone: optionalNullableString,
  primaryEmail: optionalNullableString,
  fax: optionalNullableString,
  websiteUrl: optionalNullableString,
  supportUrl: optionalNullableString,
  primaryContactUserId: optionalNullableString,
  addressLine1: optionalNullableString,
  addressLine2: optionalNullableString,
  city: optionalNullableString,
  regionId: optionalNullableString,
  countryCode: optionalNullableString,
  currencyCode: optionalNullableString,
  timezone: optionalNullableString,
  language: optionalNullableString,
})

// ── Org locations ─────────────────────────────────────────────────────────────

export const sdk876OrgLocationSchema = z.strictObject({
  object: z.literal('org_location'),
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  type: z.string(),
  status: z.string(),
  isPrimary: z.boolean(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  line1: z.string().nullable(),
  line2: z.string().nullable(),
  city: z.string().nullable(),
  regionId: z.string().nullable(),
  countryCode: z.string().nullable(),
  postalCode: z.string().nullable(),
  timezone: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  deletedAt: z.number().nullable(),
  deletedBy: z.string().nullable(),
  deletionReason: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const sdk876OrgLocationListSchema = apiListSchema(
  sdk876OrgLocationSchema
)

export const sdk876DeletedOrgLocationSchema =
  deletedObjectSchema('org_location')

export const sdk876OrgLocationCreateParamsSchema = z.strictObject({
  name: z.string().trim().min(1),
  code: optionalNullableString,
  type: z.string().optional(),
  status: z.string().optional(),
  isPrimary: z.boolean().optional(),
  phone: optionalNullableString,
  email: optionalNullableString,
  line1: optionalNullableString,
  line2: optionalNullableString,
  city: optionalNullableString,
  regionId: optionalNullableString,
  countryCode: optionalNullableString,
  postalCode: optionalNullableString,
  timezone: optionalNullableString,
  metadata: metadataSchema,
})

export const sdk876OrgLocationUpdateParamsSchema =
  sdk876OrgLocationCreateParamsSchema.partial()

// ── Org contacts ──────────────────────────────────────────────────────────────

export const sdk876OrgContactSchema = z.strictObject({
  object: z.literal('org_contact'),
  id: z.string(),
  organizationId: z.string(),
  userId: z.string().nullable(),
  firstName: z.string(),
  lastName: z.string().nullable(),
  title: z.string().nullable(),
  type: z.string(),
  isPrimary: z.boolean(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  mobile: z.string().nullable(),
  notes: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  deletedAt: z.number().nullable(),
  deletedBy: z.string().nullable(),
  deletionReason: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const sdk876OrgContactListSchema = apiListSchema(sdk876OrgContactSchema)

export const sdk876DeletedOrgContactSchema = deletedObjectSchema('org_contact')

export const sdk876OrgContactCreateParamsSchema = z.strictObject({
  firstName: z.string().trim().min(1),
  userId: optionalNullableString,
  lastName: optionalNullableString,
  title: optionalNullableString,
  type: z.string().optional(),
  isPrimary: z.boolean().optional(),
  email: optionalNullableString,
  phone: optionalNullableString,
  mobile: optionalNullableString,
  notes: optionalNullableString,
  metadata: metadataSchema,
})

export const sdk876OrgContactUpdateParamsSchema =
  sdk876OrgContactCreateParamsSchema.partial()

// ── Org departments ───────────────────────────────────────────────────────────

export const sdk876OrgDepartmentSchema = z.strictObject({
  object: z.literal('org_department'),
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  description: z.string().nullable(),
  parentDepartmentId: z.string().nullable(),
  headMembershipId: z.string().nullable(),
  status: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  deletedAt: z.number().nullable(),
  deletedBy: z.string().nullable(),
  deletionReason: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const sdk876OrgDepartmentListSchema = apiListSchema(
  sdk876OrgDepartmentSchema
)

export const sdk876DeletedOrgDepartmentSchema =
  deletedObjectSchema('org_department')

export const sdk876OrgDepartmentCreateParamsSchema = z.strictObject({
  name: z.string().trim().min(1),
  code: optionalNullableString,
  description: optionalNullableString,
  parentDepartmentId: optionalNullableString,
  headMembershipId: optionalNullableString,
  status: z.string().optional(),
  metadata: metadataSchema,
})

export const sdk876OrgDepartmentUpdateParamsSchema =
  sdk876OrgDepartmentCreateParamsSchema.partial()

// ── Employee profiles ─────────────────────────────────────────────────────────

export const sdk876EmployeeProfileSchema = z.strictObject({
  object: z.literal('employee_profile'),
  id: z.string(),
  membershipId: z.string(),
  organizationId: z.string(),
  userId: z.string().nullable(),
  employeeNumber: z.string().nullable(),
  jobTitle: z.string().nullable(),
  departmentId: z.string().nullable(),
  locationId: z.string().nullable(),
  managerMembershipId: z.string().nullable(),
  employmentType: z.string().nullable(),
  employmentStatus: z.string(),
  division: z.string().nullable(),
  costCenter: z.string().nullable(),
  workEmail: z.string().nullable(),
  workPhone: z.string().nullable(),
  startDate: z.number().nullable(),
  endDate: z.number().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  deletedAt: z.number().nullable(),
  deletedBy: z.string().nullable(),
  deletionReason: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const sdk876EmployeeProfileListSchema = apiListSchema(
  sdk876EmployeeProfileSchema
)

export const sdk876DeletedEmployeeProfileSchema =
  deletedObjectSchema('employee_profile')

export const sdk876EmployeeProfileCreateParamsSchema = z.strictObject({
  membershipId: z.string().trim().min(1),
  employeeNumber: optionalNullableString,
  jobTitle: optionalNullableString,
  departmentId: optionalNullableString,
  locationId: optionalNullableString,
  managerMembershipId: optionalNullableString,
  employmentType: optionalNullableString,
  employmentStatus: z.string().optional(),
  division: optionalNullableString,
  costCenter: optionalNullableString,
  workEmail: optionalNullableString,
  workPhone: optionalNullableString,
  startDate: z.number().nullable().optional(),
  endDate: z.number().nullable().optional(),
  metadata: metadataSchema,
})

export const sdk876EmployeeProfileUpdateParamsSchema =
  sdk876EmployeeProfileCreateParamsSchema
    .omit({ membershipId: true })
    .partial()

// ── Org roles & permission catalog ────────────────────────────────────────────

export const sdk876OrgRoleSchema = z.strictObject({
  object: z.literal('organization_role'),
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  displayName: z.string(),
  description: z.string().nullable(),
  permissions: z.array(z.string()),
  isSystem: z.boolean(),
  membersCount: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const sdk876OrgRoleListSchema = apiListSchema(sdk876OrgRoleSchema)

export const sdk876DeletedOrgRoleSchema =
  deletedObjectSchema('organization_role')

export const sdk876OrgRoleCreateParamsSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9][a-z0-9_-]*$/),
  displayName: z.string().trim().min(1).max(100),
  description: optionalNullableString,
  permissions: z.array(z.string()),
})

export const sdk876OrgRoleUpdateParamsSchema = z.strictObject({
  displayName: z.string().trim().min(1).max(100).optional(),
  description: optionalNullableString,
  permissions: z.array(z.string()).optional(),
})

export const sdk876PermissionCatalogSchema = z.strictObject({
  object: z.literal('permission_catalog'),
  groups: z.array(
    z.strictObject({
      name: z.string(),
      permissions: z.array(z.string()),
    })
  ),
})

// ── Org members ───────────────────────────────────────────────────────────────

export const sdk876OrgMemberSchema = z.strictObject({
  object: z.literal('organization_member'),
  id: z.string(),
  userId: z.string(),
  role: z.string(),
  roleId: z.string().nullable(),
  status: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string().nullable(),
  avatar: z.string().nullable(),
  createdAt: z.number(),
})

export const sdk876OrgMemberListSchema = apiListSchema(sdk876OrgMemberSchema)

export const sdk876OrgMemberMeSchema = sdk876OrgMemberSchema.extend({
  permissions: z.array(z.string()),
})

export const sdk876OrgMemberRoleUpdateParamsSchema = z.strictObject({
  role: z.string().trim().min(1).max(64),
})

export const sdk876DeletedOrgMemberSchema = deletedObjectSchema(
  'organization_member'
)

// ── Invites ──────────────────────────────────────────────────────────────────

export const sdk876InviteTokenSchema = z.strictObject({
  object: z.literal('invite_token'),
  id: z.string(),
  organizationId: z.string(),
  email: z.string(),
  role: z.string(),
  status: z.string(),
  expiresAt: z.number(),
  sourceAppId: z.string().nullable(),
  createdAt: z.number(),
})

export const sdk876InviteTokenListSchema = apiListSchema(
  sdk876InviteTokenSchema
)

export const sdk876InviteTokenCreateParamsSchema = z.strictObject({
  email: z.email(),
  role: z.string().trim().min(1).optional(),
  sourceAppId: z.string().trim().min(1).optional(),
  sourceAppSlug: z.string().trim().min(1).optional(),
})

// ── Subscriptions ────────────────────────────────────────────────────────────

export const sdk876SubscriptionItemSchema = z.strictObject({
  object: z.literal('subscription_item'),
  id: z.string(),
  priceId: z.string(),
  productId: z.string().nullable(),
  productSlug: z.string().nullable(),
  productName: z.string().nullable(),
  quantity: z.number(),
  billingThresholds: z.record(z.string(), z.unknown()).nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
})

export const sdk876SubscriptionSchema = z.strictObject({
  object: z.literal('subscription'),
  id: z.string(),
  billingAccountId: z.string().nullable(),
  organizationId: z.string(),
  appId: z.string(),
  appSlug: z.string().nullable(),
  appName: z.string().nullable(),
  appLogoUrl: z.string().nullable(),
  appKind: z.string().nullable(),
  status: z.enum([
    'incomplete',
    'incomplete_expired',
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'paused',
    'blocked',
  ]),
  providerStatus: z.string().nullable(),
  statusReason: z.string().nullable(),
  financeLifecycleVersion: z.number(),
  collectionMethod: z.string(),
  billingCycleAnchor: z.number().nullable(),
  items: z.array(sdk876SubscriptionItemSchema),
  currentPeriodStart: z.number().nullable(),
  currentPeriodEnd: z.number().nullable(),
  cancelAt: z.number().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  canceledAt: z.number().nullable(),
  endedAt: z.number().nullable(),
  pauseCollection: z.record(z.string(), z.unknown()).nullable(),
  trialStart: z.number().nullable(),
  trialEnd: z.number().nullable(),
  startDate: z.number().nullable(),
  defaultPaymentMethodId: z.string().nullable(),
  latestInvoiceId: z.string().nullable(),
  pendingUpdate: z.record(z.string(), z.unknown()).nullable(),
  scheduleId: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const sdk876SubscriptionListSchema = apiListSchema(
  sdk876SubscriptionSchema
)

// ── App assignments ───────────────────────────────────────────────────────────

export const sdk876AppAssignmentSchema = z.strictObject({
  object: z.literal('app_assignment'),
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  appId: z.string(),
  appSlug: z.string().nullable(),
  appName: z.string().nullable(),
  status: z.string(),
  assignedBy: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const sdk876AppAssignmentListSchema = apiListSchema(
  sdk876AppAssignmentSchema
)

export const sdk876AppAssignmentCreateParamsSchema = z.strictObject({
  userId: z.string().trim().min(1),
  appId: z.string().trim().min(1).optional(),
  appSlug: z.string().trim().min(1).optional(),
})

// ── Inferred types ────────────────────────────────────────────────────────────

export type Organization = z.infer<typeof sdk876OrganizationSchema>
export type OrganizationSelfUpdateParams = z.infer<
  typeof sdk876OrganizationSelfUpdateParamsSchema
>

export type OrgLocation = z.infer<typeof sdk876OrgLocationSchema>
export type OrgLocationList = z.infer<typeof sdk876OrgLocationListSchema>
export type DeletedOrgLocation = z.infer<typeof sdk876DeletedOrgLocationSchema>
export type OrgLocationCreateParams = z.infer<
  typeof sdk876OrgLocationCreateParamsSchema
>
export type OrgLocationUpdateParams = z.infer<
  typeof sdk876OrgLocationUpdateParamsSchema
>

export type OrgContact = z.infer<typeof sdk876OrgContactSchema>
export type OrgContactList = z.infer<typeof sdk876OrgContactListSchema>
export type DeletedOrgContact = z.infer<typeof sdk876DeletedOrgContactSchema>
export type OrgContactCreateParams = z.infer<
  typeof sdk876OrgContactCreateParamsSchema
>
export type OrgContactUpdateParams = z.infer<
  typeof sdk876OrgContactUpdateParamsSchema
>

export type OrgDepartment = z.infer<typeof sdk876OrgDepartmentSchema>
export type OrgDepartmentList = z.infer<typeof sdk876OrgDepartmentListSchema>
export type DeletedOrgDepartment = z.infer<
  typeof sdk876DeletedOrgDepartmentSchema
>
export type OrgDepartmentCreateParams = z.infer<
  typeof sdk876OrgDepartmentCreateParamsSchema
>
export type OrgDepartmentUpdateParams = z.infer<
  typeof sdk876OrgDepartmentUpdateParamsSchema
>

export type EmployeeProfile = z.infer<typeof sdk876EmployeeProfileSchema>
export type EmployeeProfileList = z.infer<
  typeof sdk876EmployeeProfileListSchema
>
export type DeletedEmployeeProfile = z.infer<
  typeof sdk876DeletedEmployeeProfileSchema
>
export type EmployeeProfileCreateParams = z.infer<
  typeof sdk876EmployeeProfileCreateParamsSchema
>
export type EmployeeProfileUpdateParams = z.infer<
  typeof sdk876EmployeeProfileUpdateParamsSchema
>

export type OrgRole = z.infer<typeof sdk876OrgRoleSchema>
export type OrgRoleList = z.infer<typeof sdk876OrgRoleListSchema>
export type DeletedOrgRole = z.infer<typeof sdk876DeletedOrgRoleSchema>
export type OrgRoleCreateParams = z.infer<
  typeof sdk876OrgRoleCreateParamsSchema
>
export type OrgRoleUpdateParams = z.infer<
  typeof sdk876OrgRoleUpdateParamsSchema
>
export type PermissionCatalog = z.infer<typeof sdk876PermissionCatalogSchema>

export type OrgMember = z.infer<typeof sdk876OrgMemberSchema>
export type OrgMemberList = z.infer<typeof sdk876OrgMemberListSchema>
export type OrgMemberMe = z.infer<typeof sdk876OrgMemberMeSchema>
export type OrgMemberRoleUpdateParams = z.infer<
  typeof sdk876OrgMemberRoleUpdateParamsSchema
>
export type DeletedOrgMember = z.infer<typeof sdk876DeletedOrgMemberSchema>

export type InviteToken = z.infer<typeof sdk876InviteTokenSchema>
export type InviteTokenList = z.infer<typeof sdk876InviteTokenListSchema>
export type InviteTokenCreateParams = z.infer<
  typeof sdk876InviteTokenCreateParamsSchema
>

export type SubscriptionItem = z.infer<typeof sdk876SubscriptionItemSchema>
export type Subscription = z.infer<typeof sdk876SubscriptionSchema>
export type SubscriptionList = z.infer<typeof sdk876SubscriptionListSchema>

export type AppAssignment = z.infer<typeof sdk876AppAssignmentSchema>
export type AppAssignmentList = z.infer<typeof sdk876AppAssignmentListSchema>
export type AppAssignmentCreateParams = z.infer<
  typeof sdk876AppAssignmentCreateParamsSchema
>
