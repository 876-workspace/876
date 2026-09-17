import { prisma } from '@/db/client'

export type NativeAppRow = {
  id: string
  slug: string
  clientId: string
  clientType: string
  clientSecretHash: string | null
  appKind: string
  status: string
  type: string
  allowedRedirectUris: string[]
  scopesAllowed: string[]
}

const nativeAppSelect = {
  id: true,
  slug: true,
  clientId: true,
  clientType: true,
  clientSecretHash: true,
  appKind: true,
  status: true,
  type: true,
  allowedRedirectUris: true,
  scopesAllowed: true,
} as const

export async function findNativeAppBySlug(
  slug: string
): Promise<NativeAppRow | null> {
  return prisma.app.findUnique({ where: { slug }, select: nativeAppSelect })
}

export async function createNativeApp(params: {
  id: string
  name: string
  slug: string
  organizationId: string
  clientId: string
  appKind: string
  type: string
  allowedRedirectUris: string[]
  scopesAllowed: string[]
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
      allowedRedirectUris: params.allowedRedirectUris,
      allowedLogoutUris: [],
      logoUrl: null,
      homepageUrl: null,
      type: params.type,
      scopesAllowed: params.scopesAllowed,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    },
  })
}

export async function syncNativeApp(
  id: string,
  params: {
    appKind: string
    type: string
    allowedRedirectUris: string[]
    scopesAllowed: string[]
    updatedAt: bigint
  }
): Promise<void> {
  await prisma.app.update({
    where: { id },
    data: {
      appKind: params.appKind,
      clientType: 'public',
      clientSecretHash: null,
      status: 'active',
      type: params.type,
      allowedRedirectUris: params.allowedRedirectUris,
      scopesAllowed: params.scopesAllowed,
      updatedAt: params.updatedAt,
    },
  })
}
