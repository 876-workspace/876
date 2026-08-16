import { config } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

config({
  path: ['.env.development.local', '.env.development', '.env'],
})

const directCommands = new Set(['db', 'migrate', 'studio'])
const requiresDirectUrl = process.argv.some((argument) =>
  directCommands.has(argument)
)

export default defineConfig({
  schema: 'prisma/schema',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: requiresDirectUrl
      ? process.env.BILLING_DIRECT_DATABASE_URL || env('BILLING_DATABASE_URL')
      : env('BILLING_DATABASE_URL'),
  },
})
