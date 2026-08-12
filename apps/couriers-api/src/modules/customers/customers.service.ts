import { deletedObject } from '@/http/envelope'
import { AppHttpError } from '@/platform/errors'
import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
  nowUnixSeconds,
} from '@/platform/timestamps'

import * as billing from '@/providers/billing/customers'
import { getLogger } from '@/platform/logger'
import { tenantsRepository as tenantRepo } from '@/modules/tenants'
import * as repo from './customers.repository'
import type {
  CreateCustomerBody,
  Customer,
  CustomerEnrollment,
  CustomerEnrollmentBody,
  DeleteCustomerBody,
  DeletedCustomer,
  ListCustomersQuery,
  Mailbox,
  MailboxCreateBody,
  MailboxUpdateBody,
  UpdateCustomerBody,
} from './customers.schemas'

const log = getLogger('customers')

const missing = (resource: string) =>
  new AppHttpError({
    code: `${resource}/not-found`,
    message: 'Not found.',
    httpStatus: 404,
  })

const conflict = (resource: string, message: string) =>
  new AppHttpError({ code: `${resource}/conflict`, message, httpStatus: 409 })

export async function listCustomers(
  tenantId: string,
  query: ListCustomersQuery
) {
  const rows = await repo.listTenantCustomers({ tenantId, query })
  const page = rows.slice(0, query.limit)
  return {
    data: (query.ending_before ? page.reverse() : page).map(serializeCustomer),
    hasMore: rows.length > query.limit,
  }
}

export async function retrieveCustomer(
  tenantId: string,
  id: string
): Promise<Customer> {
  const row = await repo.findTenantCustomerById(tenantId, id)
  if (!row) throw missing('customer')
  return serializeCustomer(row)
}

/** Resolve the caller's own Couriers profile without accepting a profile ID. */
export async function retrieveCustomerByUserId(
  tenantId: string,
  userId: string
): Promise<Customer> {
  const row = await repo.findTenantCustomerByUserId(tenantId, userId)
  if (!row) throw missing('customer')
  return serializeCustomer(row)
}

export async function createCustomer(
  tenantId: string,
  input: CreateCustomerBody
): Promise<Customer> {
  const tenant = await tenantRepo.findTenantById(tenantId)
  if (!tenant) throw missing('tenant')

  // High-level domain operation: Billing customer creation is idempotent. Courier profile + mailbox creation is transactionally atomic within Couriers. The overall cross-service workflow is retry-safe/idempotent.
  const billingResult = await billing.createExternalCustomer(tenant.orgId, {
    idempotencyKey: input.idempotency_key,
    customerKind: (input.customer_kind ?? 'INDIVIDUAL') as
      | 'INDIVIDUAL'
      | 'BUSINESS',
    firstName: input.first_name ?? null,
    lastName: input.last_name ?? null,
    companyName: input.company_name ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
  })
  if (billingResult.error || !billingResult.data) {
    log.warn(
      {
        errorCode: billingResult.error?.code,
        tenantId,
        orgId: tenant.orgId,
      },
      'customers.billing_create_failed'
    )
    throw new AppHttpError({
      code: 'customer/registry-unavailable',
      message: 'The customer registry is temporarily unavailable.',
      httpStatus: 503,
    })
  }
  const branchId = await resolveCustomerBranchId(tenantId, input.branch_id)
  for (let attempt = 0; attempt < MAX_ENROLLMENT_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const result = await repo.enrollTenantCustomer({
        tenantId,
        billingCustomerId: billingResult.data.id,
        userId: null,
        branchId,
        status: input.status ?? 'ACTIVE',
        trn: input.trn ?? null,
        isCommercial: input.is_commercial ?? false,
        now: nowUnixSeconds(),
      })
      if (result.kind === 'conflict')
        throw conflict(
          'customer',
          'A courier profile is linked to another customer.'
        )
      if (result.kind === 'tenant_missing') throw missing('tenant')
      if (result.kind === 'mailbox_unavailable')
        throw new AppHttpError({
          code: 'mailbox/allocation-exhausted',
          message: 'A mailbox number could not be allocated. Please try again.',
          httpStatus: 503,
        })
      return serializeCustomer(result.profile)
    } catch (error) {
      if (isForeignKeyConstraintError(error)) throw missing('branch')
      if (!isUniqueConstraintError(error)) throw error
    }
  }
  throw conflict(
    'customer',
    'A courier profile already exists for this customer.'
  )
}

const MAX_ENROLLMENT_RETRY_ATTEMPTS = 3

/** Creates or revives a profile and its primary mailbox transactionally within Couriers. */
export async function enrollCustomer(
  tenantId: string,
  input: CustomerEnrollmentBody
): Promise<CustomerEnrollment> {
  if (!(await repo.tenantExists(tenantId))) throw missing('tenant')
  for (let attempt = 0; attempt < MAX_ENROLLMENT_RETRY_ATTEMPTS; attempt += 1) {
    const branchId = await resolveCustomerBranchId(tenantId, input.branch_id)
    try {
      return await enrollAttempt(tenantId, input, branchId)
    } catch (error) {
      if (isForeignKeyConstraintError(error)) throw missing('branch')
      if (!isUniqueConstraintError(error)) throw error
    }
  }
  throw conflict(
    'customer',
    'A courier profile already exists for this customer.'
  )
}

async function enrollAttempt(
  tenantId: string,
  input: CustomerEnrollmentBody,
  branchId: string | null
): Promise<CustomerEnrollment> {
  const result = await repo.enrollTenantCustomer({
    tenantId,
    billingCustomerId: input.billing_customer_id,
    userId: input.user_id ?? null,
    branchId,
    status: input.status ?? 'ACTIVE',
    trn: null,
    isCommercial: input.is_commercial ?? false,
    now: nowUnixSeconds(),
  })
  if (result.kind === 'conflict')
    throw conflict(
      'customer',
      'A courier profile is linked to another customer.'
    )
  if (result.kind === 'tenant_missing') throw missing('tenant')
  if (result.kind === 'mailbox_unavailable')
    throw new AppHttpError({
      code: 'mailbox/allocation-exhausted',
      message: 'A mailbox number could not be allocated. Please try again.',
      httpStatus: 503,
    })
  return {
    object: 'courier_customer_enrollment',
    customer: serializeCustomer(result.profile),
    mailbox: serializeMailbox(result.mailbox),
  }
}

export async function updateCustomer(
  tenantId: string,
  id: string,
  input: UpdateCustomerBody
): Promise<Customer> {
  const profileRow = await repo.findTenantCustomerById(tenantId, id)
  if (!profileRow) throw missing('customer')
  if (typeof input.branch_id === 'string') {
    await ensureTenantBranch(tenantId, input.branch_id)
  }

  const identityKeys = [
    'first_name',
    'last_name',
    'company_name',
    'email',
    'phone',
  ] as const
  const touchesIdentity = identityKeys.some(
    (key) => (input as Record<string, unknown>)[key] !== undefined
  )
  if (touchesIdentity) {
    const tenant = await tenantRepo.findTenantById(tenantId)
    if (!tenant) throw missing('tenant')
    const current = await billing.retrieveCustomer(
      tenant.orgId,
      profileRow.billingCustomerId
    )
    if (current.error || !current.data) {
      log.warn(
        { errorCode: current.error?.code, tenantId, customerId: id },
        'customers.billing_retrieve_failed'
      )
      throw new AppHttpError({
        code: 'customer/registry-unavailable',
        message: 'The customer registry is temporarily unavailable.',
        httpStatus: 503,
      })
    }
    const registryCustomer = current.data as unknown as Record<string, unknown>
    const billingFieldMap: Record<string, string> = {
      first_name: 'firstName',
      last_name: 'lastName',
      company_name: 'companyName',
      email: 'email',
      phone: 'phone',
    }
    const hasIdentityChange = identityKeys.some((key) => {
      if ((input as Record<string, unknown>)[key] === undefined) return false
      const billingKey = billingFieldMap[key] as string
      return (
        (input as Record<string, unknown>)[key] !== registryCustomer[billingKey]
      )
    })
    if (
      hasIdentityChange &&
      (registryCustomer as unknown as { customerType: string }).customerType !==
        'EXTERNAL'
    ) {
      throw new AppHttpError({
        code: 'customer/identity-locked',
        message:
          'This customer is linked to an 876 account and cannot be renamed from Couriers.',
        httpStatus: 409,
      })
    }
    if (hasIdentityChange) {
      const registry = await billing.updateExternalCustomer(
        tenant.orgId,
        profileRow.billingCustomerId,
        {
          customerKind: (
            registryCustomer as unknown as {
              customerKind: 'INDIVIDUAL' | 'BUSINESS'
            }
          ).customerKind,
          firstName:
            (input.first_name as string | null | undefined) ??
            (registryCustomer as unknown as { firstName: string | null })
              .firstName,
          lastName:
            input.last_name === undefined
              ? (registryCustomer as unknown as { lastName: string | null })
                  .lastName
              : (input.last_name as string | null),
          companyName:
            (input.company_name as string | null | undefined) ??
            (registryCustomer as unknown as { companyName: string | null })
              .companyName,
          email:
            input.email === undefined
              ? (registryCustomer as unknown as { email: string | null }).email
              : (input.email as string | null),
          phone:
            input.phone === undefined
              ? (registryCustomer as unknown as { phone: string | null }).phone
              : (input.phone as string | null),
        }
      )
      if (registry.error || !registry.data) {
        log.warn(
          { errorCode: registry.error?.code, tenantId, customerId: id },
          'customers.billing_update_failed'
        )
        throw new AppHttpError({
          code: 'customer/registry-unavailable',
          message: 'The customer registry is temporarily unavailable.',
          httpStatus: 503,
        })
      }
    }
  }

  const courierInput: UpdateCustomerBody = {
    branch_id: input.branch_id,
    status: input.status,
    trn: input.trn,
    is_commercial: input.is_commercial,
  }

  return serializeCustomer(
    await repo.updateTenantCustomer({
      id,
      input: courierInput,
      now: nowUnixSeconds(),
    })
  )
}

export async function deleteCustomer(
  tenantId: string,
  id: string,
  input?: DeleteCustomerBody | null
): Promise<DeletedCustomer> {
  const row = await repo.findTenantCustomerById(tenantId, id)
  if (!row) throw missing('customer')
  const deletedBy = input?.deleted_by ?? null
  const deletionReason = input?.reason ?? input?.deletion_reason ?? null
  await repo.softDeleteTenantCustomer({
    id,
    now: nowUnixSeconds(),
    deletedBy,
    deletionReason,
  })
  return deletedObject('courier_customer_profile', id) as DeletedCustomer
}

export async function listMailboxes(
  tenantId: string,
  customerId: string
): Promise<Mailbox[]> {
  await retrieveCustomer(tenantId, customerId)
  return (await repo.listTenantCustomerMailboxes(tenantId, customerId)).map(
    serializeMailbox
  )
}

export async function createMailbox(
  tenantId: string,
  customerId: string,
  input: MailboxCreateBody
): Promise<Mailbox> {
  await retrieveCustomer(tenantId, customerId)
  try {
    return serializeMailbox(
      await repo.createTenantMailbox({
        tenantId,
        customerId,
        input,
        now: nowUnixSeconds(),
      })
    )
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw conflict('mailbox', 'That mailbox number is already in use.')
    }
    throw error
  }
}

export async function updateMailbox(
  tenantId: string,
  customerId: string,
  id: string,
  input: MailboxUpdateBody
): Promise<Mailbox> {
  const current = await repo.findTenantCustomerMailboxById({
    tenantId,
    customerId,
    id,
  })
  if (!current) throw missing('mailbox')

  return serializeMailbox(
    await repo.updateTenantMailbox({
      tenantId,
      customerId,
      id,
      input,
      currentIsPrimary: current.isPrimary,
      now: nowUnixSeconds(),
    })
  )
}

async function resolveCustomerBranchId(
  tenantId: string,
  branchId: string | null | undefined
): Promise<string | null> {
  if (branchId === null) return null
  if (branchId !== undefined) {
    await ensureTenantBranch(tenantId, branchId)
    return branchId
  }
  return (await repo.findTenantDefaultBranch(tenantId))?.id ?? null
}

async function ensureTenantBranch(tenantId: string, id: string): Promise<void> {
  if (!(await repo.findTenantBranchById(tenantId, id))) throw missing('branch')
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  )
}

function isForeignKeyConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2003'
  )
}

function serializeCustomer(row: {
  id: string
  tenantId: string
  userId: string | null
  billingCustomerId: string
  branchId: string | null
  status: 'ACTIVE' | 'SUSPENDED'
  trn: string | null
  isCommercial: boolean
  firstSeenAt: number | bigint
  createdAt: number | bigint
  updatedAt: number | bigint
  deletedAt: number | bigint | null
}): Customer {
  return {
    object: 'courier_customer_profile',
    id: row.id,
    tenant_id: row.tenantId,
    user_id: row.userId,
    billing_customer_id: row.billingCustomerId,
    branch_id: row.branchId,
    status: row.status,
    trn: row.trn ?? null,
    is_commercial: row.isCommercial,
    first_seen_at: fromDbUnixSeconds(row.firstSeenAt),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
    deleted_at: nullableFromDbUnixSeconds(row.deletedAt),
  }
}

function serializeMailbox(row: {
  id: string
  tenantId: string
  customerId: string
  number: string
  isPrimary: boolean
  createdAt: number | bigint
  updatedAt: number | bigint
}): Mailbox {
  return {
    object: 'mailbox',
    id: row.id,
    tenant_id: row.tenantId,
    customer_id: row.customerId,
    number: row.number,
    is_primary: row.isPrimary,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}
