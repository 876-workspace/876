/**
 * Seeds the Console role catalog (`roles`) with the four built-in
 * system roles, and optionally grants the first Console access row.
 *
 * Idempotent: upserts each role so re-running is safe.
 *
 * Console access is entirely data-driven — a user reaches Console only through
 * a persisted `console_members` row (`service.team`), never through anything
 * hardcoded in source. That leaves a chicken-and-egg problem on a fresh
 * database: the UI that grants the first membership is itself behind the
 * guard. Setting `CONSOLE_BOOTSTRAP_SUPER_ADMIN_USER_ID` to an 876 user ID is
 * the break-glass for exactly that, and for restoring access if the last
 * super admin is suspended by mistake. It is an explicit operator action, not
 * a runtime rule: the guard never reads it.
 *
 * Run: `pnpm --filter @876/console db:seed`
 * Requires `CONSOLE_DIRECT_DATABASE_URL` to point at the Console database.
 */
import { config } from 'dotenv'

import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '../src/lib/db/generated/prisma/client'
import { SYSTEM_ROLE_DEFINITIONS } from '../src/lib/permissions'

config({ path: ['.env.development.local', '.env'] })

const BOOTSTRAP_ROLE_NAME = 'super_admin'

const adapter = new PrismaPg({
  connectionString: process.env.CONSOLE_DIRECT_DATABASE_URL,
})
const prisma = new PrismaClient({ adapter })

async function seedRoles(): Promise<void> {
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
      update: {
        displayName: role.displayName,
        description: role.description,
        permissions: role.permissions,
        isSystem: true,
      },
    })
  }
  console.log(`Seeded ${SYSTEM_ROLE_DEFINITIONS.length} Console roles.`)
}

async function seedBootstrapSuperAdmin(): Promise<void> {
  const userId = process.env.CONSOLE_BOOTSTRAP_SUPER_ADMIN_USER_ID?.trim()
  if (!userId) return

  await prisma.member.upsert({
    where: { userId },
    create: { userId, roleName: BOOTSTRAP_ROLE_NAME, status: 'active' },
    update: { roleName: BOOTSTRAP_ROLE_NAME, status: 'active' },
  })
  console.log(`Granted ${BOOTSTRAP_ROLE_NAME} Console access to ${userId}.`)
}

async function main(): Promise<void> {
  await seedRoles()
  await seedBootstrapSuperAdmin()
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => {
    void prisma.$disconnect()
  })
