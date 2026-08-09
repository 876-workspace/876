import { config } from 'dotenv'

import { defineConfig, env } from 'prisma/config'

config({ path: ['.env.development.local', '.env.development', '.env'] })

export default defineConfig({
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DIRECT_DATABASE_URL ?? env('DATABASE_URL'),
  },
})
