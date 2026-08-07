import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '@/platform/timestamps'

import type {
  InviteToken,
  Organization,
  Subscription,
} from './organizations.schemas'

export type OrganizationRow = {
  id: string
  workosOrganizationId: string | null
  name: string | null
  shortName: string | null
  doingBusinessAs: string | null
  slug: string
  status: string
  logoUrl: string | null
  logoFileId: string | null
  industry: string | null
  businessType: string | null
  registrationNumber: string | null
  trn: string | null
  nisNumber: string | null
  gctNumber: string | null
  taxId: string | null
  incorporationDate: string | null
  primaryPhone: string | null
  primaryEmail: string | null
  fax: string | null
  websiteUrl: string | null
  supportUrl: string | null
  primaryContactUserId: string | null
  timezone: string | null
  language: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  regionId: string | null
  countryCode: string | null
  currencyCode: string | null
  enrollmentCompletedAt: bigint | null
  metadata: unknown | null
  deletedAt: bigint | null
  deletedBy: string | null
  deletionReason: string | null
  createdAt: bigint
  updatedAt: bigint
}

export type SubscriptionRow = {
  id: string
  billingAccountId: string | null
  organizationId: string
  appId: string
  status: string
  providerStatus: string | null
  statusReason: string | null
  financeLifecycleVersion: number
  collectionMethod: string
  billingCycleAnchor: bigint | null
  currentPeriodStart: bigint | null
  currentPeriodEnd: bigint | null
  cancelAt: bigint | null
  cancelAtPeriodEnd: boolean
  canceledAt: bigint | null
  endedAt: bigint | null
  pauseCollection: unknown
  trialStart: bigint | null
  trialEnd: bigint | null
  startDate: bigint | null
  defaultPaymentMethodId: string | null
  latestInvoiceId: string | null
  pendingUpdate: unknown
  scheduleId: string | null
  metadata: unknown
  createdAt: bigint
  updatedAt: bigint
  app?: {
    slug: string | null
    name: string | null
    logoUrl: string | null
    appKind: string | null
  } | null
  subscriptionItems?: Array<{
    id: string
    priceId: string
    quantity: number
    billingThresholds?: unknown
    metadata?: unknown
    price?: {
      id: string
      product?: { id: string; slug: string | null; name: string | null } | null
    } | null
  }>
}

/** A Json column degraded to `null` rather than breaking the response. */
function jsonObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export type InviteTokenRow = {
  id: string
  organizationId: string
  email: string
  role: string
  status: string
  expiresAt: bigint
  sourceAppId: string | null
  createdAt: bigint
}

export function serializeOrganization(row: OrganizationRow): Organization {
  return {
    object: 'organization',
    id: row.id,
    workos_organization_id: row.workosOrganizationId,
    name: row.name,
    short_name: row.shortName,
    doing_business_as: row.doingBusinessAs,
    slug: row.slug,
    status: row.status,
    logo_url: row.logoUrl,
    logo_file_id: row.logoFileId,
    industry: row.industry,
    business_type: row.businessType,
    registration_number: row.registrationNumber,
    trn: row.trn,
    nis_number: row.nisNumber,
    gct_number: row.gctNumber,
    tax_id: row.taxId,
    incorporation_date: row.incorporationDate,
    primary_phone: row.primaryPhone,
    primary_email: row.primaryEmail,
    fax: row.fax,
    website_url: row.websiteUrl,
    support_url: row.supportUrl,
    primary_contact_user_id: row.primaryContactUserId,
    timezone: row.timezone,
    language: row.language,
    address_line1: row.addressLine1,
    address_line2: row.addressLine2,
    city: row.city,
    region_id: row.regionId,
    country_code: row.countryCode,
    currency_code: row.currencyCode,
    enrollment_completed_at: nullableFromDbUnixSeconds(
      row.enrollmentCompletedAt
    ),
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    deleted_at: nullableFromDbUnixSeconds(row.deletedAt),
    deleted_by: row.deletedBy,
    deletion_reason: row.deletionReason,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeSubscription(row: SubscriptionRow): Subscription {
  const items =
    row.subscriptionItems?.map((item) => ({
      object: 'subscription_item' as const,
      id: item.id,
      price_id: item.priceId,
      product_id: item.price?.product?.id ?? null,
      product_slug: item.price?.product?.slug ?? null,
      product_name: item.price?.product?.name ?? null,
      quantity: item.quantity,
      billing_thresholds: jsonObject(item.billingThresholds),
      metadata: jsonObject(item.metadata),
    })) ?? []

  return {
    object: 'subscription',
    id: row.id,
    billing_account_id: row.billingAccountId,
    organization_id: row.organizationId,
    app_id: row.appId,
    app_slug: row.app?.slug ?? null,
    app_name: row.app?.name ?? null,
    app_logo_url: row.app?.logoUrl ?? null,
    app_kind: row.app?.appKind ?? null,
    status: row.status,
    provider_status: row.providerStatus,
    status_reason: row.statusReason,
    finance_lifecycle_version: row.financeLifecycleVersion,
    collection_method: row.collectionMethod,
    billing_cycle_anchor: nullableFromDbUnixSeconds(row.billingCycleAnchor),
    items,
    current_period_start: nullableFromDbUnixSeconds(row.currentPeriodStart),
    current_period_end: nullableFromDbUnixSeconds(row.currentPeriodEnd),
    cancel_at: nullableFromDbUnixSeconds(row.cancelAt),
    cancel_at_period_end: row.cancelAtPeriodEnd,
    canceled_at: nullableFromDbUnixSeconds(row.canceledAt),
    ended_at: nullableFromDbUnixSeconds(row.endedAt),
    pause_collection: jsonObject(row.pauseCollection),
    trial_start: nullableFromDbUnixSeconds(row.trialStart),
    trial_end: nullableFromDbUnixSeconds(row.trialEnd),
    start_date: nullableFromDbUnixSeconds(row.startDate),
    default_payment_method_id: row.defaultPaymentMethodId,
    latest_invoice_id: row.latestInvoiceId,
    pending_update: jsonObject(row.pendingUpdate),
    schedule_id: row.scheduleId,
    metadata: jsonObject(row.metadata),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeInvite(row: InviteTokenRow): InviteToken {
  return {
    object: 'invite_token',
    id: row.id,
    organization_id: row.organizationId,
    email: row.email,
    role: row.role,
    status: row.status,
    expires_at: fromDbUnixSeconds(row.expiresAt),
    source_app_id: row.sourceAppId,
    created_at: fromDbUnixSeconds(row.createdAt),
  }
}

export const ORGANIZATION_SELECT = {
  id: true,
  workosOrganizationId: true,
  name: true,
  shortName: true,
  doingBusinessAs: true,
  slug: true,
  status: true,
  logoUrl: true,
  logoFileId: true,
  industry: true,
  businessType: true,
  registrationNumber: true,
  trn: true,
  nisNumber: true,
  gctNumber: true,
  taxId: true,
  incorporationDate: true,
  primaryPhone: true,
  primaryEmail: true,
  fax: true,
  websiteUrl: true,
  supportUrl: true,
  primaryContactUserId: true,
  timezone: true,
  language: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  regionId: true,
  countryCode: true,
  currencyCode: true,
  enrollmentCompletedAt: true,
  metadata: true,
  deletedAt: true,
  deletedBy: true,
  deletionReason: true,
  createdAt: true,
  updatedAt: true,
} as const
