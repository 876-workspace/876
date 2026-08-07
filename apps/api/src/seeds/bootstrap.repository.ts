import { prisma } from '@/db/client'

export type BootstrapSummary = {
  organizationCreated: boolean
  appsCreated: number
  appsUpdated: number
}

export async function findOrganizationBySlug(
  slug: string
): Promise<{ id: string } | null> {
  return prisma.organization.findUnique({
    where: { slug },
    select: { id: true },
  })
}

export async function createOrganization(params: {
  id: string
  name: string
  shortName: string
  slug: string
  status: string
  createdAt: bigint
  updatedAt: bigint
}): Promise<{ id: string }> {
  return prisma.organization.create({
    data: {
      id: params.id,
      name: params.name,
      shortName: params.shortName,
      slug: params.slug,
      status: params.status,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    },
    select: { id: true },
  })
}

export async function findAppBySlug(
  slug: string
): Promise<{ id: string; slug: string; appKind: string } | null> {
  return prisma.app.findUnique({
    where: { slug },
    select: { id: true, slug: true, appKind: true },
  })
}

export async function createApp(params: {
  id: string
  name: string
  slug: string
  organizationId: string
  clientId: string
  appKind: string
  homepageUrl: string | null
  createdAt: bigint
  updatedAt: bigint
}): Promise<void> {
  await prisma.app.create({
    data: {
      id: params.id,
      name: params.name,
      slug: params.slug,
      organizationId: params.organizationId,
      clientId: params.clientId,
      clientSecretHash: null,
      clientType: 'public',
      appKind: params.appKind,
      status: 'active',
      allowedRedirectUris: [],
      allowedLogoutUris: [],
      logoUrl: null,
      homepageUrl: params.homepageUrl,
      type: 'web',
      scopesAllowed: ['openid', 'profile', 'email'],
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    },
  })
}

export async function updateAppKind(
  appId: string,
  appKind: string,
  updatedAt: bigint
): Promise<void> {
  await prisma.app.update({
    where: { id: appId },
    data: { appKind, updatedAt },
  })
}
