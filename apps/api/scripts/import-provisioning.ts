import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildApplicationImportDraft,
  buildFinanceImportDraft,
  buildOrganizationImportDraft,
  importProvisioningSpecification,
  provisioningImportSpecificationSchema,
} from '@/modules/provisioning'

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

async function main(): Promise<void> {
  if (hasFlag('help') || hasFlag('h')) {
    console.log(`Usage: pnpm --filter @876/api provisioning:import [options]

Explicitly imports versioned provisioning bootstrap data. This command is not a
seed and is never run by service startup or pnpm seed.

Options:
  --file=<path>  Import specification JSON. Defaults to the Phase 1 handoff file.
  --dry-run      Parse and build every manifest without writing to the database.
  --help, -h     Show this help.`)
    return
  }

  const file = argumentValue('file')
  const path = file ? resolve(process.cwd(), file) : DEFAULT_SPEC_PATH
  const spec = await loadSpecification(path)

  if (hasFlag('dry-run')) {
    for (const setup of spec.setups) buildFinanceImportDraft(spec, setup)
    buildOrganizationImportDraft(spec)
    for (const app of spec.application_manifests) buildApplicationImportDraft(app)

    console.log(
      JSON.stringify(
        {
          object: 'provisioning_import_validation',
          valid: true,
          manifest_version: 1,
          file: path,
          setups: spec.setups.length,
          application_manifests: spec.application_manifests.length,
          default_setup_key: spec.default_setup_key,
        },
        null,
        2
      )
    )
    return
  }

  const summary = await importProvisioningSpecification(spec)
  console.log(JSON.stringify({ ...summary, file: path }, null, 2))
}

try {
  await main()
} finally {
  try {
    const { disconnectDb } = await import('@/db/client')
    await disconnectDb()
  } catch {
    // The dry-run path may never initialize Prisma.
  }
}
