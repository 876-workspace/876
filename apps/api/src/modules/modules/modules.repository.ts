import type { Prisma } from '@/db'
import { prisma } from '@/db/client'

import type { ModuleRow } from './modules.serializers'

/** Every query against `application_modules`. */

const SELECT = {
  id: true,
  appId: true,
  key: true,
  name: true,
  description: true,
  featureId: true,
  status: true,
  position: true,
  createdAt: true,
  updatedAt: true,
  feature: { select: { slug: true } },
} as const

// Position first, then name, then id — a deterministic order, so two modules
// sharing a position never swap places between requests.
const ORDER = [
  { position: 'asc' as const },
  { name: 'asc' as const },
  { id: 'asc' as const },
]

export function findById(moduleId: string): Promise<ModuleRow | null> {
  return prisma.applicationModule.findUnique({
    where: { id: moduleId },
    select: SELECT,
  })
}

export function findByKey(
  appId: string,
  key: string
): Promise<ModuleRow | null> {
  return prisma.applicationModule.findFirst({
    where: { appId, key },
    select: SELECT,
  })
}

export function findByFeature(
  appId: string,
  featureId: string
): Promise<ModuleRow | null> {
  return prisma.applicationModule.findFirst({
    where: { appId, featureId },
    select: SELECT,
  })
}

export function listForApp(
  appId: string,
  includeArchived: boolean
): Promise<ModuleRow[]> {
  return prisma.applicationModule.findMany({
    where: { appId, ...(includeArchived ? {} : { status: 'active' }) },
    orderBy: ORDER,
    select: SELECT,
  })
}

/**
 * The modules an organization is actually entitled to.
 *
 * Entitlement is a chain: module → plan module → product → price →
 * subscription item → subscription. Expressed as nested relation filters rather
 * than five joins, so Prisma emits one query and the shape stays readable.
 * Only `active` and `trialing` subscriptions grant access — a past-due or
 * cancelled one does not.
 */
export function listEntitled(
  organizationId: string,
  appId: string
): Promise<ModuleRow[]> {
  return prisma.applicationModule.findMany({
    where: {
      appId,
      status: 'active',
      planModules: {
        some: {
          product: {
            appId,
            prices: {
              some: {
                subscriptionItems: {
                  some: {
                    subscription: {
                      organizationId,
                      appId,
                      status: { in: ['active', 'trialing'] },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    select: SELECT,
  })
}

export function create(
  data: Prisma.ApplicationModuleUncheckedCreateInput
): Promise<ModuleRow> {
  return prisma.applicationModule.create({ data, select: SELECT })
}

export function update(
  moduleId: string,
  data: Prisma.ApplicationModuleUncheckedUpdateInput
): Promise<ModuleRow> {
  return prisma.applicationModule.update({
    where: { id: moduleId },
    data,
    select: SELECT,
  })
}

/**
 * Detach a module from every plan that sells it.
 *
 * Archiving a module must not leave it billable: a plan that still lists an
 * archived module would keep granting an entitlement to something the app no
 * longer exposes.
 */
export async function deletePlanModules(moduleId: string): Promise<void> {
  await prisma.planModule.deleteMany({ where: { moduleId } })
}

export async function appIsProduct(appId: string): Promise<boolean> {
  const app = await prisma.app.findUnique({
    where: { id: appId },
    select: { appKind: true },
  })
  return app?.appKind === 'product'
}

export async function appExists(appId: string): Promise<boolean> {
  const app = await prisma.app.findUnique({
    where: { id: appId },
    select: { id: true },
  })
  return app !== null
}

export function findFeature(featureId: string): Promise<{
  id: string
  appId: string | null
  parentFeatureId: string | null
  slug: string
} | null> {
  return prisma.feature.findUnique({
    where: { id: featureId },
    select: { id: true, appId: true, parentFeatureId: true, slug: true },
  })
}
