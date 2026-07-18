import * as z from 'zod'

const optionalNullableString = z.string().nullable().optional()
const metadataSchema = z.record(z.string(), z.unknown()).nullable().optional()

function apiListSchema<TItem>(itemSchema: z.ZodType<TItem>) {
  return z.strictObject({
    object: z.literal('list'),
    data: z.array(itemSchema),
    has_more: z.boolean(),
    total_count: z.number().nullable().optional(),
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
  workos_organization_id: z.string().nullable(),
  name: z.string().nullable(),
  short_name: z.string().nullable(),
  doing_business_as: z.string().nullable(),
  slug: z.string(),
  status: z.string(),
  logo_url: z.string().nullable(),
  industry: z.string().nullable(),
  business_type: z.string().nullable(),
  registration_number: z.string().nullable(),
  trn: z.string().nullable(),
  nis_number: z.string().nullable(),
  gct_number: z.string().nullable(),
  tax_id: z.string().nullable(),
  incorporation_date: z.string().nullable(),
  primary_phone: z.string().nullable(),
  primary_email: z.string().nullable(),
  fax: z.string().nullable(),
  website_url: z.string().nullable(),
  support_url: z.string().nullable(),
  primary_contact_user_id: z.string().nullable(),
  timezone: z.string().nullable(),
  language: z.string().nullable(),
  address_line1: z.string().nullable(),
  address_line2: z.string().nullable(),
  city: z.string().nullable(),
  region_id: z.string().nullable(),
  country_code: z.string().nullable(),
  currency_code: z.string().nullable(),
  enrollment_completed_at: z.number().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  deleted_at: z.number().nullable(),
  deleted_by: z.string().nullable(),
  deletion_reason: z.string().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
})

export const sdk876OrganizationSelfUpdateParamsSchema = z.strictObject({
  name: optionalNullableString,
  short_name: optionalNullableString,
  doing_business_as: optionalNullableString,
  logo_url: optionalNullableString,
  industry: optionalNullableString,
  business_type: optionalNullableString,
  registration_number: optionalNullableString,
  trn: optionalNullableString,
  nis_number: optionalNullableString,
  gct_number: optionalNullableString,
  tax_id: optionalNullableString,
  incorporation_date: optionalNullableString,
  primary_phone: optionalNullableString,
  primary_email: optionalNullableString,
  fax: optionalNullableString,
  website_url: optionalNullableString,
  support_url: optionalNullableString,
  primary_contact_user_id: optionalNullableString,
  address_line1: optionalNullableString,
  address_line2: optionalNullableString,
  city: optionalNullableString,
  region_id: optionalNullableString,
  country_code: optionalNullableString,
  currency_code: optionalNullableString,
  timezone: optionalNullableString,
  language: optionalNullableString,
})

// ── Org locations ─────────────────────────────────────────────────────────────

export const sdk876OrgLocationSchema = z.strictObject({
  object: z.literal('org_location'),
  id: z.string(),
  organization_id: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  type: z.string(),
  status: z.string(),
  is_primary: z.boolean(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  line1: z.string().nullable(),
  line2: z.string().nullable(),
  city: z.string().nullable(),
  region_id: z.string().nullable(),
  country_code: z.string().nullable(),
  postal_code: z.string().nullable(),
  timezone: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  deleted_at: z.number().nullable(),
  deleted_by: z.string().nullable(),
  deletion_reason: z.string().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
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
  is_primary: z.boolean().optional(),
  phone: optionalNullableString,
  email: optionalNullableString,
  line1: optionalNullableString,
  line2: optionalNullableString,
  city: optionalNullableString,
  region_id: optionalNullableString,
  country_code: optionalNullableString,
  postal_code: optionalNullableString,
  timezone: optionalNullableString,
  metadata: metadataSchema,
})

export const sdk876OrgLocationUpdateParamsSchema =
  sdk876OrgLocationCreateParamsSchema.partial()

// ── Org contacts ──────────────────────────────────────────────────────────────

export const sdk876OrgContactSchema = z.strictObject({
  object: z.literal('org_contact'),
  id: z.string(),
  organization_id: z.string(),
  user_id: z.string().nullable(),
  first_name: z.string(),
  last_name: z.string().nullable(),
  title: z.string().nullable(),
  type: z.string(),
  is_primary: z.boolean(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  mobile: z.string().nullable(),
  notes: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  deleted_at: z.number().nullable(),
  deleted_by: z.string().nullable(),
  deletion_reason: z.string().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
})

export const sdk876OrgContactListSchema = apiListSchema(sdk876OrgContactSchema)

export const sdk876DeletedOrgContactSchema = deletedObjectSchema('org_contact')

export const sdk876OrgContactCreateParamsSchema = z.strictObject({
  first_name: z.string().trim().min(1),
  user_id: optionalNullableString,
  last_name: optionalNullableString,
  title: optionalNullableString,
  type: z.string().optional(),
  is_primary: z.boolean().optional(),
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
  organization_id: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  description: z.string().nullable(),
  parent_department_id: z.string().nullable(),
  head_membership_id: z.string().nullable(),
  status: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  deleted_at: z.number().nullable(),
  deleted_by: z.string().nullable(),
  deletion_reason: z.string().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
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
  parent_department_id: optionalNullableString,
  head_membership_id: optionalNullableString,
  status: z.string().optional(),
  metadata: metadataSchema,
})

export const sdk876OrgDepartmentUpdateParamsSchema =
  sdk876OrgDepartmentCreateParamsSchema.partial()

// ── Employee profiles ─────────────────────────────────────────────────────────

export const sdk876EmployeeProfileSchema = z.strictObject({
  object: z.literal('employee_profile'),
  id: z.string(),
  membership_id: z.string(),
  organization_id: z.string(),
  user_id: z.string().nullable(),
  employee_number: z.string().nullable(),
  job_title: z.string().nullable(),
  department_id: z.string().nullable(),
  location_id: z.string().nullable(),
  manager_membership_id: z.string().nullable(),
  employment_type: z.string().nullable(),
  employment_status: z.string(),
  division: z.string().nullable(),
  cost_center: z.string().nullable(),
  work_email: z.string().nullable(),
  work_phone: z.string().nullable(),
  start_date: z.number().nullable(),
  end_date: z.number().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  deleted_at: z.number().nullable(),
  deleted_by: z.string().nullable(),
  deletion_reason: z.string().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
})

export const sdk876EmployeeProfileListSchema = apiListSchema(
  sdk876EmployeeProfileSchema
)

export const sdk876DeletedEmployeeProfileSchema =
  deletedObjectSchema('employee_profile')

export const sdk876EmployeeProfileCreateParamsSchema = z.strictObject({
  membership_id: z.string().trim().min(1),
  employee_number: optionalNullableString,
  job_title: optionalNullableString,
  department_id: optionalNullableString,
  location_id: optionalNullableString,
  manager_membership_id: optionalNullableString,
  employment_type: optionalNullableString,
  employment_status: z.string().optional(),
  division: optionalNullableString,
  cost_center: optionalNullableString,
  work_email: optionalNullableString,
  work_phone: optionalNullableString,
  start_date: z.number().nullable().optional(),
  end_date: z.number().nullable().optional(),
  metadata: metadataSchema,
})

export const sdk876EmployeeProfileUpdateParamsSchema =
  sdk876EmployeeProfileCreateParamsSchema
    .omit({ membership_id: true })
    .partial()

// ── Org roles & permission catalog ────────────────────────────────────────────

export const sdk876OrgRoleSchema = z.strictObject({
  object: z.literal('organization_role'),
  id: z.string(),
  organization_id: z.string(),
  name: z.string(),
  display_name: z.string(),
  description: z.string().nullable(),
  permissions: z.array(z.string()),
  is_system: z.boolean(),
  members_count: z.number().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
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
  display_name: z.string().trim().min(1).max(100),
  description: optionalNullableString,
  permissions: z.array(z.string()),
})

export const sdk876OrgRoleUpdateParamsSchema = z.strictObject({
  display_name: z.string().trim().min(1).max(100).optional(),
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
  user_id: z.string(),
  role: z.string(),
  role_id: z.string().nullable(),
  status: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  email: z.string().nullable(),
  avatar: z.string().nullable(),
  created_at: z.number(),
})

export const sdk876OrgMemberListSchema = apiListSchema(sdk876OrgMemberSchema)

export const sdk876OrgMemberMeSchema = sdk876OrgMemberSchema.extend({
  permissions: z.array(z.string()),
})

export const sdk876OrgMemberRoleUpdateParamsSchema = z.strictObject({
  role: z.string().trim().min(1).max(64),
})

// ── App assignments ───────────────────────────────────────────────────────────

export const sdk876AppAssignmentSchema = z.strictObject({
  object: z.literal('app_assignment'),
  id: z.string(),
  organization_id: z.string(),
  user_id: z.string(),
  app_id: z.string(),
  app_slug: z.string().nullable(),
  app_name: z.string().nullable(),
  status: z.string(),
  assigned_by: z.string().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
})

export const sdk876AppAssignmentListSchema = apiListSchema(
  sdk876AppAssignmentSchema
)

export const sdk876AppAssignmentCreateParamsSchema = z.strictObject({
  user_id: z.string().trim().min(1),
  app_id: z.string().trim().min(1).optional(),
  app_slug: z.string().trim().min(1).optional(),
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

export type AppAssignment = z.infer<typeof sdk876AppAssignmentSchema>
export type AppAssignmentList = z.infer<typeof sdk876AppAssignmentListSchema>
export type AppAssignmentCreateParams = z.infer<
  typeof sdk876AppAssignmentCreateParamsSchema
>
