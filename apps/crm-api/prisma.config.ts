import { config } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

config({ path: ['.env.development.local', '.env.development', '.env'] })

const DIRECT_DATABASE_COMMANDS = new Set(['db', 'migrate', 'studio'])
const requiresDirectDatabaseUrl = process.argv.some((argument) =>
  DIRECT_DATABASE_COMMANDS.has(argument)
)

export default defineConfig({
  schema: 'prisma/schema',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    // `generate` is offline and needs only the runtime datasource shape. Neon's
    // pooler is transaction-mode PgBouncer and cannot hold the advisory locks
    // `prisma migrate` takes, so DB/migrate/studio use the direct endpoint.
    url: requiresDirectDatabaseUrl
      ? env('CRM_DIRECT_DATABASE_URL')
      : env('CRM_DATABASE_URL'),
  },
})
