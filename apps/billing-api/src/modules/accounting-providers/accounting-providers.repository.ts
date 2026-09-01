import { prisma } from '@/db/client'

import type {
  AccountingConnectionCreateBody,
  AccountingConnectionUpdateBody,
} from './accounting-providers.schemas'

const providerInclude = { provider: true } as const

export function listAccountingProviderRows() {
  return prisma.accountingProvider.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    take: 100,
  })
}

export function findActiveAccountingProviderRow(id: string) {
  return prisma.accountingProvider.findFirst({ where: { id, isActive: true } })
}

export function listAccountingConnectionRows(tenantId: string) {
  return prisma.accountingProviderConnection.findMany({
    where: { tenantId },
    include: providerInclude,
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}

export function findAccountingConnectionRow(tenantId: string, id: string) {
  return prisma.accountingProviderConnection.findFirst({
    where: { tenantId, id },
    include: providerInclude,
  })
}

export function findAccountingConnectionById(id: string) {
  return prisma.accountingProviderConnection.findUnique({
    where: { id },
    include: providerInclude,
  })
}

export function createAccountingConnectionRow(params: {
  tenantId: string
  id: string
  body: AccountingConnectionCreateBody
  accountsDomain: string
  now: number
}) {
  return prisma.accountingProviderConnection.create({
    data: {
      id: params.id,
      tenantId: params.tenantId,
      providerId: params.body.providerId,
      name: params.body.name,
      environment: params.body.environment,
      status: 'pending',
      mode: params.body.mode,
      accountsDomain: params.accountsDomain,
      createdAt: params.now,
      updatedAt: params.now,
    },
    include: providerInclude,
  })
}

export async function updateAccountingConnectionRow(
  tenantId: string,
  id: string,
  body: AccountingConnectionUpdateBody,
  now: number
) {
  const result = await prisma.accountingProviderConnection.updateMany({
    where: { tenantId, id },
    data: { ...body, updatedAt: now },
  })
  return result.count ? findAccountingConnectionRow(tenantId, id) : null
}

export async function setAccountingOauthState(params: {
  tenantId: string
  id: string
  oauthStateHash: string
  oauthStateExpiresAt: number
  now: number
}) {
  const result = await prisma.accountingProviderConnection.updateMany({
    where: { tenantId: params.tenantId, id: params.id },
    data: {
      oauthStateHash: params.oauthStateHash,
      oauthStateExpiresAt: params.oauthStateExpiresAt,
      updatedAt: params.now,
    },
  })
  return result.count > 0
}

export function completeAccountingOauth(params: {
  id: string
  accountsDomain: string
  apiDomain: string
  providerOrganizationId: string
  scopes: string[]
  sealedRefreshToken: string
  refreshTokenKeyId: string | null
  refreshTokenVaultProvider: string
  now: number
}) {
  return prisma.accountingProviderConnection.update({
    where: { id: params.id },
    data: {
      accountsDomain: params.accountsDomain,
      apiDomain: params.apiDomain,
      providerOrganizationId: params.providerOrganizationId,
      scopes: params.scopes,
      sealedRefreshToken: params.sealedRefreshToken,
      refreshTokenKeyId: params.refreshTokenKeyId,
      refreshTokenVaultProvider: params.refreshTokenVaultProvider,
      oauthStateHash: null,
      oauthStateExpiresAt: null,
      status: 'active',
      lastErrorCode: null,
      updatedAt: params.now,
    },
    include: providerInclude,
  })
}

export function markAccountingConnectionHealthy(id: string, now: number) {
  return prisma.accountingProviderConnection.update({
    where: { id },
    data: {
      status: 'active',
      lastSuccessfulSyncAt: now,
      lastErrorCode: null,
      updatedAt: now,
    },
    include: providerInclude,
  })
}

export function markAccountingConnectionError(
  id: string,
  code: string,
  now: number
) {
  return prisma.accountingProviderConnection.update({
    where: { id },
    data: { status: 'error', lastErrorCode: code, updatedAt: now },
    include: providerInclude,
  })
}

export function disableAccountingConnectionRow(
  tenantId: string,
  id: string,
  now: number
) {
  return prisma.accountingProviderConnection.updateMany({
    where: { tenantId, id },
    data: {
      status: 'disabled',
      sealedRefreshToken: null,
      refreshTokenKeyId: null,
      refreshTokenVaultProvider: null,
      oauthStateHash: null,
      oauthStateExpiresAt: null,
      updatedAt: now,
    },
  })
}
