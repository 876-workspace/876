/**
 * One-time backfill: migrate Console access from the identity database
 * into Console's own database.
 *
 * Source (read-only): the identity API's Postgres (`users` table), connected via
 *   `MC_BACKFILL_SOURCE_URL` (set it to the identity `DATABASE_URL`).
 * Target: Console's Postgres, via Prisma (`CONSOLE_DATABASE_URL`).
 *
 * For every identity user with a Console `role` (anything other than the
 * default `user`), this:
 *   1. ensures the `roles` catalog is seeded, and
 *   2. upserts a Console `users` access row { userId, roleName, status }.
 *
 * The identity DB is NOT modified — access lives solely in Console's
 * `users` table now (no `is_staff` echo), so this script only reads the source.
 *
 * SAFETY: read-only against the source; idempotent against the target. Run and
 * verify the printed counts BEFORE the identity migration drops `users.role` /
 * the `console_member_roles` table.
 *
 * Run: `MC_BACKFILL_SOURCE_URL=… pnpm --filter @876/console db:backfill`
 */
import { config } from 'dotenv'

import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '../src/lib/db/generated/prisma/client'
import { SYSTEM_ROLE_DEFINITIONS } from '../src/lib/permissions'

const { Client } = pg

config({ path: ['.env.development.local', '.env'] })

type SourceUserRole = { id: string; role: string }

async function seedRoles(prisma: PrismaClient): Promise<void> {
  for (const role of SYSTEM_ROLE_DEFINITIONS) {
    await prisma.role.upsert({
      where: { name: role.name },
      create: {
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        permissions: role.permissions,
        isSystem: true,
      },
      update: {},
    })
  }
}

async function readSourceUsers(sourceUrl: string): Promise<SourceUserRole[]> {
  const client = new Client({ connectionString: sourceUrl })
  await client.connect()
  try {
    // 'user' (or NULL) means no Console access; everything else is an
    // Console role that becomes an access row in Console's own DB.
    const { rows } = await client.query<SourceUserRole>(
      `SELECT id, role FROM users
       WHERE role IS NOT NULL AND role <> 'user' AND deleted_at IS NULL`
    )
    return rows
  } finally {
    await client.end()
  }
}

async function main(): Promise<void> {
  const sourceUrl = process.env.MC_BACKFILL_SOURCE_URL
  if (!sourceUrl) {
    throw new Error(
      'MC_BACKFILL_SOURCE_URL is required (identity DATABASE_URL).'
    )
  }

  const adapter = new PrismaPg({
    connectionString: process.env.CONSOLE_DATABASE_URL,
  })
  const prisma = new PrismaClient({ adapter })
  try {
    await seedRoles(prisma)
    const sourceUsers = await readSourceUsers(sourceUrl)

    const validRoles = new Set(SYSTEM_ROLE_DEFINITIONS.map((r) => r.name))
    const unknownRoles = sourceUsers.filter((u) => !validRoles.has(u.role))
    if (unknownRoles.length > 0) {
      throw new Error(
        `Refusing to backfill: ${unknownRoles.length} user(s) carry an unknown ` +
          `role: ${[...new Set(unknownRoles.map((u) => u.role))].join(', ')}`
      )
    }

    let created = 0
    for (const { id, role } of sourceUsers) {
      const result = await prisma.member.upsert({
        where: { userId: id },
        create: { userId: id, roleName: role, status: 'active' },
        update: { roleName: role },
      })
      if (result.createdAt.getTime() === result.updatedAt.getTime())
        created += 1
    }

    const mcUserCount = await prisma.member.count()

    // Verification: every source MC-role-holder must now have an access row.
    if (mcUserCount < sourceUsers.length) {
      throw new Error(
        `Verification FAILED: ${sourceUsers.length} source MC-role-holders but ` +
          `only ${mcUserCount} Console users exist.`
      )
    }

    console.log(
      `Backfill OK — source MC-role-holders: ${sourceUsers.length}, ` +
        `Console users now: ${mcUserCount} (created ${created} this run).\n` +
        `Next: confirm Console sign-in works off these access rows, then ` +
        `drop users.role / console_member_roles from the identity DB.`
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
