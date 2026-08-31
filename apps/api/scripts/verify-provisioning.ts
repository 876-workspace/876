import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { provisioningImportSpecificationSchema } from '@/modules/provisioning/provisioning-import.schemas'
import { verifyProvisioningImport } from '@/modules/provisioning/provisioning-import-verification.service'

const DEFAULT_SPEC_PATH = fileURLToPath(
  new URL(
    '../../../docs/handoff/data/2026-08-31-provisioning-defaults.v1.json',
    import.meta.url
  )
)

function argumentValue(name: string): string | null {
  const prefix = `--${name}=`
  const value = process.argv.slice(2).find((arg) => arg.startsWith(prefix))
  return value ? value.slice(prefix.length) : null
}

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`)
}

async function loadSpecification(path: string) {
  const text = await readFile(path, 'utf8')
  const json: unknown = JSON.parse(text)
  return provisioningImportSpecificationSchema.parse(json)
}

async function main(): Promise<{ exitCode: number; databaseUsed: boolean }> {
  if (hasFlag('help') || hasFlag('h')) {
    console.log(`Usage: pnpm --filter @876/api provisioning:verify [options]

Verifies the database state expected after the one-time Phase 1 provisioning
import. This command never changes provisioning data.

Options:
  --file=<path>  Verification specification. Defaults to the Phase 1 handoff file.
  --help, -h     Show this help.`)
    return { exitCode: 0, databaseUsed: false }
  }

  const file = argumentValue('file')
  const path = file ? resolve(process.cwd(), file) : DEFAULT_SPEC_PATH
  const spec = await loadSpecification(path)
  const result = await verifyProvisioningImport(spec)

  console.log(JSON.stringify({ ...result, file: path }, null, 2))
  return { exitCode: result.valid ? 0 : 1, databaseUsed: true }
}

let exitCode = 1
let databaseUsed = false
try {
  const result = await main()
  exitCode = result.exitCode
  databaseUsed = result.databaseUsed
} finally {
  if (databaseUsed) {
    const { disconnectDb } = await import('@/db/client')
    await disconnectDb()
  }
}
process.exitCode = exitCode
