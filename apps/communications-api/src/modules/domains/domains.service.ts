import { err, ok, type ServiceResult } from '../../http/result.js'
import { generateId } from '../../platform/ids.js'
import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
  nowUnixSeconds,
  toDbUnixSeconds,
} from '../../platform/timestamps.js'
import { getEmailProvider, type EmailProvider } from '../../providers/index.js'
import { providerErrorToAppError } from '../../providers/provider-errors.js'
import {
  emailDomainRecordSchema,
  emailDomainStatusSchema,
  type CreateEmailDomainInput,
  type EmailDomain,
} from '../../types/communications.js'
import * as repository from './domains.repository.js'

type DomainRow = NonNullable<Awaited<ReturnType<typeof repository.retrieve>>>

function serializeRecords(
  records: Awaited<ReturnType<EmailProvider['createDomain']>>['records']
): Array<Record<string, string | number>> {
  return records.map((record) => ({
    name: record.name,
    type: record.type,
    value: record.value,
    ...(record.status ? { status: record.status } : {}),
    ...(record.ttl ? { ttl: record.ttl } : {}),
    ...(record.priority !== undefined ? { priority: record.priority } : {}),
  }))
}

function toObject(row: DomainRow): EmailDomain {
  if (row.provider !== 'resend')
    throw new Error(`Unsupported email provider: ${row.provider}`)

  const status = emailDomainStatusSchema.parse(row.status)
  const records = emailDomainRecordSchema.array().parse(row.records)

  return {
    object: 'email_domain',
    id: row.id,
    organizationId: row.organizationId,
    provider: 'resend',
    name: row.name,
    region: row.region,
    status,
    records,
    verifiedAt: nullableFromDbUnixSeconds(row.verifiedAt),
    lastCheckedAt: nullableFromDbUnixSeconds(row.lastCheckedAt),
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}


function resolveProvider(provided?: EmailProvider): ServiceResult<EmailProvider> {
  if (provided) return ok(provided)
  try {
    return ok(getEmailProvider())
  } catch (error) {
    return { data: null, error: providerErrorToAppError(error) }
  }
}

export async function listDomains(
  organizationId: string
): Promise<ServiceResult<EmailDomain[]>> {
  const rows = await repository.list(organizationId)
  return ok(rows.map((row) => toObject(row)))
}

export async function retrieveDomain(
  organizationId: string,
  id: string
): Promise<ServiceResult<EmailDomain>> {
  const row = await repository.retrieve(organizationId, id)
  if (!row) return err('communications/domain-not-found')
  return ok(toObject(row))
}

export async function createDomain(
  organizationId: string,
  input: CreateEmailDomainInput,
  provider?: EmailProvider
): Promise<ServiceResult<EmailDomain>> {
  const activeProvider = resolveProvider(provider)
  if (activeProvider.error) return { data: null, error: activeProvider.error }
  const emailProvider = activeProvider.data

  const existing = await repository.retrieveByName(organizationId, input.name)
  if (existing) return err('communications/domain-already-exists')

  let remote
  try {
    remote = await emailProvider.createDomain(input)
  } catch (error) {
    return { data: null, error: providerErrorToAppError(error) }
  }

  const now = nowUnixSeconds()
  const row = await repository.create({
    id: generateId('domain'),
    organizationId,
    provider: emailProvider.name,
    providerDomainId: remote.providerDomainId,
    name: remote.name,
    region: remote.region,
    status: remote.status,
    records: serializeRecords(remote.records),
    verifiedAt: remote.status === 'verified' ? toDbUnixSeconds(now) : null,
    lastCheckedAt: toDbUnixSeconds(now),
    now: toDbUnixSeconds(now),
  })

  return ok(toObject(row))
}

export async function verifyDomain(
  organizationId: string,
  id: string,
  provider?: EmailProvider
): Promise<ServiceResult<EmailDomain>> {
  const activeProvider = resolveProvider(provider)
  if (activeProvider.error) return { data: null, error: activeProvider.error }
  const emailProvider = activeProvider.data

  const row = await repository.retrieve(organizationId, id)
  if (!row) return err('communications/domain-not-found')

  let remote
  try {
    await emailProvider.verifyDomain(row.providerDomainId)
    remote = await emailProvider.retrieveDomain(row.providerDomainId)
  } catch (error) {
    return { data: null, error: providerErrorToAppError(error) }
  }

  const now = nowUnixSeconds()
  const updated = await repository.updateProviderState({
    id: row.id,
    organizationId,
    status: remote.status,
    records: serializeRecords(remote.records),
    region: remote.region,
    verifiedAt:
      remote.status === 'verified'
        ? row.verifiedAt ?? toDbUnixSeconds(now)
        : row.verifiedAt,
    lastCheckedAt: toDbUnixSeconds(now),
  })

  return ok(toObject(updated))
}

export async function refreshDomain(
  organizationId: string,
  id: string,
  provider?: EmailProvider
): Promise<ServiceResult<EmailDomain>> {
  const activeProvider = resolveProvider(provider)
  if (activeProvider.error) return { data: null, error: activeProvider.error }
  const emailProvider = activeProvider.data

  const row = await repository.retrieve(organizationId, id)
  if (!row) return err('communications/domain-not-found')

  let remote
  try {
    remote = await emailProvider.retrieveDomain(row.providerDomainId)
  } catch (error) {
    return { data: null, error: providerErrorToAppError(error) }
  }

  const now = nowUnixSeconds()
  const updated = await repository.updateProviderState({
    id: row.id,
    organizationId,
    status: remote.status,
    records: serializeRecords(remote.records),
    region: remote.region,
    verifiedAt:
      remote.status === 'verified'
        ? row.verifiedAt ?? toDbUnixSeconds(now)
        : row.verifiedAt,
    lastCheckedAt: toDbUnixSeconds(now),
  })
  return ok(toObject(updated))
}

export async function deleteDomain(
  organizationId: string,
  id: string,
  actorId: string | null,
  provider?: EmailProvider
) {
  const activeProvider = resolveProvider(provider)
  if (activeProvider.error) return { data: null, error: activeProvider.error }
  const emailProvider = activeProvider.data

  const row = await repository.retrieve(organizationId, id)
  if (!row) return err('communications/domain-not-found')

  try {
    await emailProvider.deleteDomain(row.providerDomainId)
  } catch (error) {
    return { data: null, error: providerErrorToAppError(error) }
  }

  await repository.softDelete({
    id,
    organizationId,
    deletedBy: actorId,
    deletionReason: 'Removed through Communications API.',
    now: toDbUnixSeconds(nowUnixSeconds()),
  })

  return ok({ object: 'email_domain' as const, id, deleted: true as const })
}
