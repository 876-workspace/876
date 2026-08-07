import { z } from 'zod'

import { paginationQuerySchema } from '@/http/envelope'

export const organizationSchema = z
  .object({
    object: z.literal('organization'),
    id: z.string(),
    workos_organization_id: z.string().nullable(),
    name: z.string().nullable(),
    short_name: z.string().nullable(),
    doing_business_as: z.string().nullable(),
    slug: z.string(),
    status: z.string(),
    logo_url: z.string().nullable(),
    logo_file_id: z.string().nullable(),
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
    enrollment_completed_at: z.number().int().nullable(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
    deleted_at: z.number().int().nullable(),
    deleted_by: z.string().nullable(),
    deletion_reason: z.string().nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'Organization' })

export type Organization = z.infer<typeof organizationSchema>

export const organizationDeleteSchema = z.object({
  object: z.literal('organization'),
  id: z.string(),
  deleted: z.literal(true),
})

export const organizationBootstrapBodySchema = z.strictObject({
  ownerUserId: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().optional().nullable(),
})

export type OrganizationBootstrapBody = z.infer<
  typeof organizationBootstrapBodySchema
>

export const organizationCreateBodySchema = z.strictObject({
  workos_organization_id: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  short_name: z.string().optional().nullable(),
  doing_business_as: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  business_type: z.string().optional().nullable(),
  registration_number: z.string().optional().nullable(),
  trn: z.string().optional().nullable(),
  nis_number: z.string().optional().nullable(),
  gct_number: z.string().optional().nullable(),
  tax_id: z.string().optional().nullable(),
  incorporation_date: z.string().optional().nullable(),
  fax: z.string().optional().nullable(),
  primary_contact_user_id: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  primary_phone: z.string().optional().nullable(),
  primary_email: z.string().optional().nullable(),
  website_url: z.string().optional().nullable(),
  support_url: z.string().optional().nullable(),
  address_line1: z.string().optional().nullable(),
  address_line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  region_id: z.string().optional().nullable(),
  country_code: z.string().optional().nullable(),
  currency_code: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

export type OrganizationCreateBody = z.infer<
  typeof organizationCreateBodySchema
>

export const organizationUpdateBodySchema = z.strictObject({
  workos_organization_id: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  short_name: z.string().optional().nullable(),
  doing_business_as: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  business_type: z.string().optional().nullable(),
  registration_number: z.string().optional().nullable(),
  trn: z.string().optional().nullable(),
  nis_number: z.string().optional().nullable(),
  gct_number: z.string().optional().nullable(),
  tax_id: z.string().optional().nullable(),
  incorporation_date: z.string().optional().nullable(),
  fax: z.string().optional().nullable(),
  primary_contact_user_id: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  primary_phone: z.string().optional().nullable(),
  primary_email: z.string().optional().nullable(),
  website_url: z.string().optional().nullable(),
  support_url: z.string().optional().nullable(),
  address_line1: z.string().optional().nullable(),
  address_line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  region_id: z.string().optional().nullable(),
  country_code: z.string().optional().nullable(),
  currency_code: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  logo_url: z.string().optional().nullable(),
  logo_file_id: z.string().optional().nullable(),
})

export type OrganizationUpdateBody = z.infer<
  typeof organizationUpdateBodySchema
>

export const orgProfileUpdateBodySchema = z.strictObject({
  name: z.string().optional().nullable(),
  short_name: z.string().optional().nullable(),
  doing_business_as: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  business_type: z.string().optional().nullable(),
  registration_number: z.string().optional().nullable(),
  trn: z.string().optional().nullable(),
  nis_number: z.string().optional().nullable(),
  gct_number: z.string().optional().nullable(),
  tax_id: z.string().optional().nullable(),
  incorporation_date: z.string().optional().nullable(),
  fax: z.string().optional().nullable(),
  primary_contact_user_id: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
  logo_file_id: z.string().optional().nullable(),
  primary_phone: z.string().optional().nullable(),
  primary_email: z.string().optional().nullable(),
  website_url: z.string().optional().nullable(),
  support_url: z.string().optional().nullable(),
  address_line1: z.string().optional().nullable(),
  address_line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  region_id: z.string().optional().nullable(),
  country_code: z.string().optional().nullable(),
  currency_code: z.string().optional().nullable(),
})

export type OrgProfileUpdateBody = z.infer<typeof orgProfileUpdateBodySchema>

export const orgSetupBodySchema = z.strictObject({
  organizationId: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  primary_phone: z.string().min(1),
  address_line1: z.string().min(1),
  city: z.string().min(1),
  regionId: z.string().min(1),
  countryCode: z.string().min(1),
  currencyCode: z.string().min(1),
  primary_email: z.string().optional().nullable(),
  websiteUrl: z.string().optional().nullable(),
  supportUrl: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
})

export type OrgSetupBody = z.infer<typeof orgSetupBodySchema>

export const organizationSelfUpdateBodySchema = z.strictObject({
  name: z.string().optional().nullable(),
  short_name: z.string().optional().nullable(),
  doing_business_as: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  business_type: z.string().optional().nullable(),
  registration_number: z.string().optional().nullable(),
  trn: z.string().optional().nullable(),
  nis_number: z.string().optional().nullable(),
  gct_number: z.string().optional().nullable(),
  tax_id: z.string().optional().nullable(),
  incorporation_date: z.string().optional().nullable(),
  primary_phone: z.string().optional().nullable(),
  primary_email: z.string().optional().nullable(),
  fax: z.string().optional().nullable(),
  website_url: z.string().optional().nullable(),
  support_url: z.string().optional().nullable(),
  primary_contact_user_id: z.string().optional().nullable(),
  address_line1: z.string().optional().nullable(),
  address_line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  region_id: z.string().optional().nullable(),
  country_code: z.string().optional().nullable(),
  currency_code: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
})

export type OrganizationSelfUpdateBody = z.infer<
  typeof organizationSelfUpdateBodySchema
>

/**
 * The subscription contract lives here, not in `billing`, because
 * `domains/billing/router.py` imports `SubscriptionResponse` and
 * `_serialize_subscription` from the organizations domain rather than
 * declaring its own. Two declarations would also collide on the OpenAPI schema
 * id and take `/openapi.json` down with a 500 — which is exactly what happened
 * when both modules defined one.
 */
export const subscriptionItemSchema = z
  .object({
    object: z.literal('subscription_item'),
    id: z.string(),
    price_id: z.string(),
    product_id: z.string().nullable(),
    product_slug: z.string().nullable(),
    product_name: z.string().nullable(),
    quantity: z.number().int(),
    billing_thresholds: z.record(z.string(), z.unknown()).nullable(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
  })
  .meta({ id: 'SubscriptionItem' })

export const subscriptionSchema = z
  .object({
    object: z.literal('subscription'),
    id: z.string(),
    billing_account_id: z.string().nullable(),
    organization_id: z.string(),
    app_id: z.string(),
    app_slug: z.string().nullable(),
    app_name: z.string().nullable(),
    app_logo_url: z.string().nullable(),
    app_kind: z.string().nullable(),
    status: z.string(),
    provider_status: z.string().nullable(),
    status_reason: z.string().nullable(),
    finance_lifecycle_version: z.number().int().min(0),
    collection_method: z.string(),
    billing_cycle_anchor: z.number().int().nullable(),
    items: z.array(subscriptionItemSchema),
    current_period_start: z.number().int().nullable(),
    current_period_end: z.number().int().nullable(),
    cancel_at: z.number().int().nullable(),
    cancel_at_period_end: z.boolean(),
    canceled_at: z.number().int().nullable(),
    ended_at: z.number().int().nullable(),
    pause_collection: z.record(z.string(), z.unknown()).nullable(),
    trial_start: z.number().int().nullable(),
    trial_end: z.number().int().nullable(),
    start_date: z.number().int().nullable(),
    default_payment_method_id: z.string().nullable(),
    latest_invoice_id: z.string().nullable(),
    pending_update: z.record(z.string(), z.unknown()).nullable(),
    schedule_id: z.string().nullable(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'Subscription' })

export type Subscription = z.infer<typeof subscriptionSchema>

export const subscriptionProvisionBodySchema = z.strictObject({
  app_id: z.string().optional().nullable(),
  app_slug: z.string().optional().nullable(),
  price_id: z.string().optional().nullable(),
})

export type SubscriptionProvisionBody = z.infer<
  typeof subscriptionProvisionBodySchema
>

export const subscriptionUpdateBodySchema = z.strictObject({
  status: z
    .enum([
      'incomplete',
      'incomplete_expired',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'paused',
      'blocked',
    ])
    .optional()
    .nullable(),
  price_id: z.string().optional().nullable(),
  cancel_at_period_end: z.boolean().optional().nullable(),
})

export type SubscriptionUpdateBody = z.infer<
  typeof subscriptionUpdateBodySchema
>

export const subscriptionBatchSchema = z.object({
  object: z.literal('list'),
  data: z.array(subscriptionSchema),
  total_count: z.number().int(),
})

export const inviteTokenSchema = z
  .object({
    object: z.literal('invite_token'),
    id: z.string(),
    organization_id: z.string(),
    email: z.string(),
    role: z.string(),
    status: z.string(),
    expires_at: z.number().int(),
    source_app_id: z.string().nullable(),
    created_at: z.number().int(),
  })
  .meta({ id: 'InviteToken' })

export type InviteToken = z.infer<typeof inviteTokenSchema>

export const inviteCreateBodySchema = z.strictObject({
  email: z.string().min(1),
  role: z.string().optional().nullable(),
  source_app_id: z.string().optional().nullable(),
  source_app_slug: z.string().optional().nullable(),
})

export type InviteCreateBody = z.infer<typeof inviteCreateBodySchema>

export const invitePreviewSchema = z.object({
  object: z.literal('invite_preview'),
  org_name: z.string().nullable(),
  org_slug: z.string(),
  email: z.string(),
  role: z.string(),
  expires_at: z.number().int(),
})

export const membershipSchema = z.object({
  object: z.literal('membership'),
  id: z.string(),
  organization_id: z.string(),
  user_id: z.string(),
  role: z.string(),
  status: z.string(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
})

/** Shared pagination / filtering for org lists. */
export const listOrganizationsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  include_deleted: z.stringbool().optional().default(false),
  status: z.string().optional(),
})

export type ListOrganizationsQuery = z.infer<
  typeof listOrganizationsQuerySchema
>

export const searchOrganizationsQuerySchema = z.object({
  query: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
})

export type SearchOrganizationsQuery = z.infer<
  typeof searchOrganizationsQuerySchema
>

export const organizationIdParamsSchema = z.strictObject({
  organization_id: z.string(),
})
export const orgIdParamsSchema = z.strictObject({ org_id: z.string() })
export const organizationSlugParamsSchema = z.strictObject({ slug: z.string() })
export const appIdParamsSchema = z.strictObject({
  org_id: z.string(),
  app_id: z.string(),
})
export const appSlugParamsSchema = z.strictObject({
  org_id: z.string(),
  app_slug: z.string(),
})
export const batchSubscriptionsQuerySchema = z.strictObject({
  organization_ids: z.string().min(1),
})
export const inviteIdParamsSchema = z.strictObject({
  organization_id: z.string(),
  invite_id: z.string(),
})
export const inviteTokenParamsSchema = z.strictObject({ token: z.string() })
export const acceptInviteQuerySchema = z.strictObject({
  userId: z.string().min(1),
})
export const retrieveOrganizationQuerySchema = z.strictObject({
  include_deleted: z.stringbool().optional().default(false),
})
