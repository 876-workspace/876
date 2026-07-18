import 'dotenv/config'
import { PrismaClient } from '../src/lib/db/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is not set')

const adapter = new PrismaPg({ connectionString })
const db = new PrismaClient({ adapter })

async function main() {
  const now = Math.floor(Date.now() / 1000)

  // Dev tenant — maps to localhost (for local development)
  const tenant = await db.tenant.upsert({
    where: { slug: 'dev' },
    create: {
      orgId: 'org_dev_placeholder',
      slug: 'dev',
      name: '876 Couriers (Dev)',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      domains: {
        createMany: {
          data: [
            {
              hostname: 'localhost',
              isPrimary: true,
              verified: true,
              createdAt: now,
              updatedAt: now,
            },
            {
              hostname: 'dev.couriers.876.app',
              isPrimary: false,
              verified: true,
              createdAt: now,
              updatedAt: now,
            },
          ],
          skipDuplicates: true,
        },
      },
    },
    update: { updatedAt: now },
    include: { domains: true },
  })

  console.log('Seeded dev tenant:', tenant.id)
  console.log('Domains:', tenant.domains.map((d) => d.hostname).join(', '))
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
