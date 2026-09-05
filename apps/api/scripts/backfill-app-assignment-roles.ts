import { resolveAppAssignmentRole } from '@876/core/access'

import { disconnectDb, prisma } from '@/db/client'

function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(`--${flag}`)
}

async function main(): Promise<void> {
  if (hasFlag('help')) {
    console.log(
      'Usage: pnpm --filter @876/api app-access:backfill-roles [--apply]'
    )
    return
  }

  const apply = hasFlag('apply')
  const assignments = await prisma.appAssignment.findMany({
    where: {
      status: 'active',
      deletedAt: null,
      revokedAt: null,
      appRole: { is: { isDefault: true, deletedAt: null } },
    },
    select: {
      id: true,
      organizationId: true,
      userId: true,
      appId: true,
      appRoleId: true,
      user: {
        select: {
          memberships: {
            where: { deletedAt: null, status: 'active' },
            select: { organizationId: true, role: true },
          },
        },
      },
    },
  })

  const rows = [] as Array<{
    assignmentId: string
    fromRoleId: string
    toRoleId: string
    organizationRole: string
  }>
  for (const assignment of assignments) {
    const membership = assignment.user.memberships.find(
      (candidate) => candidate.organizationId === assignment.organizationId
    )
    if (!membership || !assignment.appRoleId) continue
    const roles = await prisma.appRole.findMany({
      where: {
        organizationId: assignment.organizationId,
        appId: assignment.appId,
        deletedAt: null,
      },
      orderBy: [{ isDefault: 'desc' }, { position: 'asc' }, { id: 'asc' }],
      select: { id: true, key: true, isDefault: true, deletedAt: true },
    })
    const role = resolveAppAssignmentRole({
      organizationRole: membership.role,
      roles,
    }).role
    if (!role || role.id === assignment.appRoleId) continue
    rows.push({
      assignmentId: assignment.id,
      fromRoleId: assignment.appRoleId,
      toRoleId: role.id,
      organizationRole: membership.role,
    })
  }

  let changed = 0
  if (apply) {
    for (const row of rows) {
      // Compare-and-set so an operator or another process changing the role
      // after candidate discovery wins instead of being overwritten by backfill.
      const result = await prisma.appAssignment.updateMany({
        where: {
          id: row.assignmentId,
          appRoleId: row.fromRoleId,
          status: 'active',
          deletedAt: null,
          revokedAt: null,
        },
        data: { appRoleId: row.toRoleId },
      })
      changed += result.count
    }
  }

  console.log(
    JSON.stringify(
      {
        object: 'app_assignment_role_backfill',
        dryRun: !apply,
        examined: assignments.length,
        changed,
        skippedAfterDiscovery: apply ? rows.length - changed : 0,
        candidates: rows,
      },
      null,
      2
    )
  )
}

try {
  await main()
} finally {
  await disconnectDb()
}
