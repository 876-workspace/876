#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const PLACEHOLDER = 'postgresql://placeholder/placeholder'
const require = createRequire(import.meta.url)

let cli
try {
  cli = require.resolve('prisma/build/index.js')
} catch {
  console.error(
    'Could not resolve the Prisma CLI. Run `pnpm install` in apps/communications-api first.'
  )
  process.exit(1)
}

const result = spawnSync(process.execPath, [cli, 'generate'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    COMMUNICATIONS_DATABASE_URL:
      process.env.COMMUNICATIONS_DATABASE_URL || PLACEHOLDER,
  },
})

if (result.error) {
  console.error(`prisma generate could not start: ${result.error.message}`)
  process.exit(1)
}

process.exit(result.status ?? 1)
