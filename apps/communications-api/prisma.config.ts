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
    url: requiresDirectDatabaseUrl
      ? env('COMMUNICATIONS_DIRECT_DATABASE_URL')
      : env('COMMUNICATIONS_DATABASE_URL'),
  },
})
