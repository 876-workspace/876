import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma, type PrismaTransactionClient } from '@/lib/db'
import { DEFAULT_ROLE_DEFINITIONS } from '@/lib/permissions'
import type { DefaultRoleKey } from '@/types/permissions'

import { isUniqueConstraintError } from '../prisma-errors'

const DEFAULT_ROLE_KEYS: DefaultRoleKey[] = ['admin', 'staff']

export async function ensureDefaults(
  tenantId: string,
  tx?: PrismaTransactionClient
): Promise<void> {
  const client = tx ?? prisma

  const existing = await client.role.findMany({
    where: { tenantId, systemKey: { in: DEFAULT_ROLE_KEYS } },
    select: { systemKey: true },
  })
  const present = new Set(existing.map((role) => role.systemKey))

  const missing = DEFAULT_ROLE_KEYS.filter((key) => !present.has(key))
  if (missing.length === 0) return

  const now = nowUnixSeconds()

  await Promise.all(
    missing.map(async (systemKey) => {
      const definition = DEFAULT_ROLE_DEFINITIONS[systemKey]

      try {
        await client.role.create({
          data: {
            tenantId,
            name: definition.name,
            description: definition.description,
            systemKey,
            permissions: [],
            createdAt: now,
            updatedAt: now,
          },
        })
      } catch (error) {
        // A concurrent ensure may have created this default already.
        if (!isUniqueConstraintError(error)) throw error
      }
    })
  )
}
