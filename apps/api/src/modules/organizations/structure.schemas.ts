import { z } from 'zod'

export const orgLocationSchema = z
  .object({
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
    deleted_at: z.number().int().nullable(),
    deleted_by: z.string().nullable(),
    deletion_reason: z.string().nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'OrgLocation' })

export type OrgLocation = z.infer<typeof orgLocationSchema>

export const orgLocationCreateSchema = z.strictObject({
  name: z.string().min(1),
  code: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  is_primary: z.boolean().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  line1: z.string().optional().nullable(),
  line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  region_id: z.string().optional().nullable(),
  country_code: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

export type OrgLocationCreate = z.infer<typeof orgLocationCreateSchema>

export const orgLocationUpdateSchema = z.strictObject({
  name: z.string().optional().nullable(),
  code: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  is_primary: z.boolean().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  line1: z.string().optional().nullable(),
  line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  region_id: z.string().optional().nullable(),
  country_code: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

export type OrgLocationUpdate = z.infer<typeof orgLocationUpdateSchema>

export const orgContactSchema = z
  .object({
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
    deleted_at: z.number().int().nullable(),
    deleted_by: z.string().nullable(),
    deletion_reason: z.string().nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'OrgContact' })

export type OrgContact = z.infer<typeof orgContactSchema>

export const orgContactCreateSchema = z.strictObject({
  user_id: z.string().optional().nullable(),
  first_name: z.string().min(1),
  last_name: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  is_primary: z.boolean().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

export type OrgContactCreate = z.infer<typeof orgContactCreateSchema>

export const orgContactUpdateSchema = z.strictObject({
  user_id: z.string().optional().nullable(),
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  is_primary: z.boolean().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

export type OrgContactUpdate = z.infer<typeof orgContactUpdateSchema>

export const orgDepartmentSchema = z
  .object({
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
    deleted_at: z.number().int().nullable(),
    deleted_by: z.string().nullable(),
    deletion_reason: z.string().nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'OrgDepartment' })

export type OrgDepartment = z.infer<typeof orgDepartmentSchema>

export const orgDepartmentCreateSchema = z.strictObject({
  name: z.string().min(1),
  code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  parent_department_id: z.string().optional().nullable(),
  head_membership_id: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

export type OrgDepartmentCreate = z.infer<typeof orgDepartmentCreateSchema>

export const orgDepartmentUpdateSchema = z.strictObject({
  name: z.string().optional().nullable(),
  code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  parent_department_id: z.string().optional().nullable(),
  head_membership_id: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

export type OrgDepartmentUpdate = z.infer<typeof orgDepartmentUpdateSchema>

export const employeeProfileSchema = z
  .object({
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
    start_date: z.number().int().nullable(),
    end_date: z.number().int().nullable(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
    deleted_at: z.number().int().nullable(),
    deleted_by: z.string().nullable(),
    deletion_reason: z.string().nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'EmployeeProfile' })

export type EmployeeProfile = z.infer<typeof employeeProfileSchema>

export const employeeProfileCreateSchema = z.strictObject({
  membership_id: z.string().min(1),
  employee_number: z.string().optional().nullable(),
  job_title: z.string().optional().nullable(),
  department_id: z.string().optional().nullable(),
  location_id: z.string().optional().nullable(),
  manager_membership_id: z.string().optional().nullable(),
  employment_type: z.string().optional().nullable(),
  employment_status: z.string().optional().nullable(),
  division: z.string().optional().nullable(),
  cost_center: z.string().optional().nullable(),
  work_email: z.string().optional().nullable(),
  work_phone: z.string().optional().nullable(),
  start_date: z.number().int().optional().nullable(),
  end_date: z.number().int().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

export type EmployeeProfileCreate = z.infer<typeof employeeProfileCreateSchema>

export const employeeProfileUpdateSchema = z.strictObject({
  employee_number: z.string().optional().nullable(),
  job_title: z.string().optional().nullable(),
  department_id: z.string().optional().nullable(),
  location_id: z.string().optional().nullable(),
  manager_membership_id: z.string().optional().nullable(),
  employment_type: z.string().optional().nullable(),
  employment_status: z.string().optional().nullable(),
  division: z.string().optional().nullable(),
  cost_center: z.string().optional().nullable(),
  work_email: z.string().optional().nullable(),
  work_phone: z.string().optional().nullable(),
  start_date: z.number().int().optional().nullable(),
  end_date: z.number().int().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

export type EmployeeProfileUpdate = z.infer<typeof employeeProfileUpdateSchema>

export const orgLocationDeleteSchema = z.object({
  object: z.literal('org_location'),
  id: z.string(),
  deleted: z.literal(true),
})
export const orgContactDeleteSchema = z.object({
  object: z.literal('org_contact'),
  id: z.string(),
  deleted: z.literal(true),
})
export const orgDepartmentDeleteSchema = z.object({
  object: z.literal('org_department'),
  id: z.string(),
  deleted: z.literal(true),
})
export const employeeProfileDeleteSchema = z.object({
  object: z.literal('employee_profile'),
  id: z.string(),
  deleted: z.literal(true),
})

export const orgIdParamsSchema = z.strictObject({ org_id: z.string() })
export const locationIdParamsSchema = z.strictObject({
  org_id: z.string(),
  location_id: z.string(),
})
export const contactIdParamsSchema = z.strictObject({
  org_id: z.string(),
  contact_id: z.string(),
})
export const departmentIdParamsSchema = z.strictObject({
  org_id: z.string(),
  department_id: z.string(),
})
export const employeeIdParamsSchema = z.strictObject({
  org_id: z.string(),
  profile_id: z.string(),
})
