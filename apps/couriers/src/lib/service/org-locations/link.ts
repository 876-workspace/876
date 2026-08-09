import { prisma } from '@/lib/db'

/**
 * Records the core location a Couriers site was mirrored to.
 *
 * The mirror itself is orchestration and lives in `@/lib/manage/org-locations`,
 * but the write it produces is still table access and belongs here — the
 * service layer stays the only thing that touches Prisma, so it can move into a
 * standalone API unchanged.
 */
export async function linkSite(params: {
  kind: 'branch' | 'warehouse'
  id: string
  orgLocationId: string
}): Promise<void> {
  if (params.kind === 'branch') {
    await prisma.branch.update({
      where: { id: params.id },
      data: { orgLocationId: params.orgLocationId },
    })
    return
  }

  await prisma.warehouse.update({
    where: { id: params.id },
    data: { orgLocationId: params.orgLocationId },
  })
}
