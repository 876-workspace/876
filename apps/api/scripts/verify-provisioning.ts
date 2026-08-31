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

async function loadSpecification(path: string) {
  const text = await readFile(path, 'utf8')
  const json: unknown = JSON.parse(text)
  return provisioningImportSpecificationSchema.parse(json)
}

async function main(): Promise<number> {
  const file = argumentValue('file')
  const path = file ? resolve(process.cwd(), file) : DEFAULT_SPEC_PATH
  const spec = await loadSpecification(path)
  const result = await verifyProvisioningImport(spec)

  console.log(JSON.stringify({ ...result, file: path }, null, 2))
  return result.valid ? 0 : 1
}

let exitCode = 1
try {
  exitCode = await main()
} finally {
  const { disconnectDb } = await import('@/db/client')
  await disconnectDb()
}
process.exitCode = exitCode
