import { config } from 'dotenv'

import { defineConfig, env } from 'prisma/config'

config({ path: ['.env.development.local', '.env.development', '.env'] })

export default defineConfig({
  // Must be the directory, not prisma/schema/schema.prisma — Prisma 7 ignores
  // sibling .prisma files when this points at a single file.
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DIRECT_DATABASE_URL'),
  },
})
