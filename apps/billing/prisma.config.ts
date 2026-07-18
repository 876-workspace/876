import { config } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

config({ path: ['.env.local', '.env'] })

export default defineConfig({
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('BILLING_DATABASE_URL'),
  },
})
