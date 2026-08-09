import { config } from 'dotenv'

import { defineConfig, env } from 'prisma/config'

config({ path: ['.env.development.local', '.env.development', '.env'] })

const DIRECT_DATABASE_COMMANDS = new Set(['db', 'migrate', 'studio'])
const requiresDirectDatabaseUrl = process.argv.some((argument) =>
  DIRECT_DATABASE_COMMANDS.has(argument)
)

export default defineConfig({
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // `generate` is offline and needs only the runtime datasource shape. DB
    // commands and migrations must use the direct PostgreSQL URL instead of
    // the Prisma Accelerate runtime URL.
    url: requiresDirectDatabaseUrl
      ? env('DIRECT_DATABASE_URL')
      : env('DATABASE_URL'),
  },
})
