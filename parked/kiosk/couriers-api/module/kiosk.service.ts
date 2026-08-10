import { createHash, randomBytes, randomInt } from 'node:crypto'
import { AppHttpError } from '@/platform/errors'
import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
  nowUnixSeconds,
} from '@/platform/timestamps'
import { prisma } from './kiosk.repository'
import type {
  CreatePickupChallengeBody,
  Device,
  EnrollBody,
  LookupQuery,
} from './kiosk.schemas'
import type { KioskPrincipal } from './kiosk.auth'

const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const notFound = (resource: string) =>
  new AppHttpError({
    code: `${resource}/not-found`,
    message: 'Not found.',
    httpStatus: 404,
  })
const forbidden = () =>
  new AppHttpError({
    code: 'kiosk-device/branch-forbidden',
    message: 'This device is not authorized for that branch.',
    httpStatus: 403,
  })
const invalidCode = () =>
  new AppHttpError({
    code: 'pickup/invalid-code',
    message: 'The pickup code is invalid or expired.',
    httpStatus: 403,
  })
export async function enroll(tenantId: string, input: EnrollBody) {
  const branch = await prisma.branch.findFirst({
    where: { id: input.branch_id, tenantId },
  })
  if (!branch) throw notFound('branch')
  const credential = `kdev_${randomBytes(32).toString('base64url')}`
  const now = nowUnixSeconds()
  const row = await prisma.kioskDevice.create({
    data: {
      tenantId,
      branchId: input.branch_id,
      name: input.name,
      credentialHash: hash(credential),
      createdAt: now,
      updatedAt: now,
    },
  })
  return {
    object: 'kiosk_device_enrollment' as const,
    device: serializeDevice(row),
    credential,
  }
}
export async function listDevices(tenantId: string): Promise<Device[]> {
  return (
    await prisma.kioskDevice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    })
  ).map(serializeDevice)
}
export async function revoke(tenantId: string, id: string): Promise<Device> {
  const current = await prisma.kioskDevice.findFirst({
    where: { tenantId, id },
  })
  if (!current) throw notFound('kiosk-device')
  return serializeDevice(
    await prisma.kioskDevice.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: nowUnixSeconds(),
        updatedAt: nowUnixSeconds(),
      },
    })
  )
}
export async function createPickupChallenge(
  tenantId: string,
  packageId: string,
  input: CreatePickupChallengeBody
) {
  const pkg = await prisma.package.findFirst({
    where: { id: packageId, tenantId, status: 'READY_FOR_PICKUP' },
  })
  if (!pkg) throw notFound('package')
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
  const now = nowUnixSeconds()
  const expiresAt = now + input.expires_in_seconds
  await prisma.packagePickupChallenge.create({
    data: { packageId, codeHash: hash(code), expiresAt, createdAt: now },
  })
  return {
    object: 'package_pickup_challenge' as const,
    package_id: packageId,
    code,
    expires_at: expiresAt,
  }
}
export async function lookup(principal: KioskPrincipal, query: LookupQuery) {
  const mailbox = await prisma.mailbox.findUnique({
    where: {
      mailboxes_tenant_id_number_key: {
        tenantId: principal.tenantId,
        number: query.mailbox_number.toUpperCase(),
      },
    },
  })
  if (!mailbox) throw invalidCode()
  const rows = await prisma.package.findMany({
    where: {
      tenantId: principal.tenantId,
      mailboxId: mailbox.id,
      branchId: principal.branchId,
      status: 'READY_FOR_PICKUP',
    },
    orderBy: { createdAt: 'asc' },
  })
  const valid = await prisma.packagePickupChallenge.findFirst({
    where: {
      codeHash: hash(query.pickup_code),
      expiresAt: { gt: nowUnixSeconds() },
      usedAt: null,
      packageId: { in: rows.map((row) => row.id) },
    },
  })
  if (!valid) throw invalidCode()
  return rows.map((row) => ({
    object: 'kiosk_package' as const,
    id: row.id,
    tracking_number: row.trackingNum,
    description: row.description,
    status: 'READY_FOR_PICKUP' as const,
    quantity: row.quantity,
  }))
}
export async function collect(
  principal: KioskPrincipal,
  packageId: string,
  pickupCode: string
) {
  const now = nowUnixSeconds()
  return prisma.$transaction(async (tx) => {
    const pkg = await tx.package.findFirst({
      where: {
        id: packageId,
        tenantId: principal.tenantId,
        branchId: principal.branchId,
        status: 'READY_FOR_PICKUP',
      },
    })
    if (!pkg) throw forbidden()
    const challenge = await tx.packagePickupChallenge.findFirst({
      where: {
        packageId,
        codeHash: hash(pickupCode),
        expiresAt: { gt: now },
        usedAt: null,
      },
    })
    if (!challenge) throw invalidCode()
    await tx.packagePickupChallenge.update({
      where: { id: challenge.id },
      data: { usedAt: now },
    })
    const collected = await tx.package.update({
      where: { id: packageId },
      data: { status: 'COLLECTED', collectedAt: now, updatedAt: now },
    })
    return {
      object: 'kiosk_package' as const,
      id: collected.id,
      tracking_number: collected.trackingNum,
      description: collected.description,
      status: 'COLLECTED' as const,
      quantity: collected.quantity,
    }
  })
}
function serializeDevice(row: {
  id: string
  tenantId: string
  branchId: string
  name: string
  status: 'ACTIVE' | 'REVOKED'
  lastUsedAt: number | null
  revokedAt: number | null
  createdAt: number
  updatedAt: number
}): Device {
  return {
    object: 'kiosk_device',
    id: row.id,
    tenant_id: row.tenantId,
    branch_id: row.branchId,
    name: row.name,
    status: row.status,
    last_used_at: nullableFromDbUnixSeconds(row.lastUsedAt),
    revoked_at: nullableFromDbUnixSeconds(row.revokedAt),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}
