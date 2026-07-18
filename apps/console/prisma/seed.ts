/**
 * Seeds the Console role catalog (`roles`) with the four built-in
 * system roles. Idempotent: upserts each role so re-running is safe.
 *
 * Run: `pnpm --filter @876/console db:seed`
 * Requires `CONSOLE_DATABASE_URL` to point at the Console database.
 */
import { config } from 'dotenv'

import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '../src/lib/db/generated/prisma/client'
import { SYSTEM_ROLE_DEFINITIONS } from '../src/lib/permissions'

config({ path: ['.env.development.local', '.env'] })

const adapter = new PrismaPg({
  connectionString: process.env.CONSOLE_DATABASE_URL,
})
const prisma = new PrismaClient({ adapter })

async function main(): Promise<void> {
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

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => {
    void prisma.$disconnect()
  })
