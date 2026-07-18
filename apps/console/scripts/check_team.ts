import { prisma } from '../src/lib/db/index'
import { config } from 'dotenv'

config({ path: ['.env.local', '.env'] })

async function main() {
  const users = await prisma.member.findMany()
  console.log('Members:', users)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
