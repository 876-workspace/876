import { config } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

config({ path: ['.env.development.local', '.env'] })

export default defineConfig({
  schema: 'prisma/schema',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env('CRM_DATABASE_URL') },
})
