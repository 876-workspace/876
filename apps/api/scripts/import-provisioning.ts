import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildApplicationImportDraft,
  buildFinanceImportDraft,
  buildOrganizationImportDraft,
} from '@/modules/provisioning/provisioning-import.builders'
import { provisioningImportSpecificationSchema } from '@/modules/provisioning/provisioning-import.schemas'

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

async function main(): Promise<'dry-run' | 'import'> {
  if (hasFlag('help') || hasFlag('h')) {
    console.log(`Usage: pnpm --filter @876/api provisioning:import [options]

Explicitly imports the one-time provisioning bootstrap file. This command is
not a seed and is never run by service startup or pnpm seed.

Options:
  --file=<path>  Import specification JSON. Defaults to the Phase 1 handoff file.
  --dry-run      Parse and build every manifest without initializing Prisma.
  --help, -h     Show this help.`)
    return 'dry-run'
  }

  const file = argumentValue('file')
  const path = file ? resolve(process.cwd(), file) : DEFAULT_SPEC_PATH
  const spec = await loadSpecification(path)

  if (hasFlag('dry-run')) {
    for (const setup of spec.setups) buildFinanceImportDraft(spec, setup)
    buildOrganizationImportDraft(spec)
    for (const app of spec.application_manifests)
      buildApplicationImportDraft(app)

    console.log(
      JSON.stringify(
        {
          object: 'provisioning_import_validation',
          valid: true,
          manifest_version: 1,
          import_mode: spec.import_mode,
          file: path,
          setups: spec.setups.length,
          caribbean_markets: spec.country_scope.caribbean.length,
          united_states: spec.country_scope.united_states,
          canada: spec.country_scope.canada,
          application_manifests: spec.application_manifests.length,
          default_setup_key: spec.default_setup_key,
        },
        null,
        2
      )
    )
    return 'dry-run'
  }

  const { importProvisioningSpecification } = await import(
    '@/modules/provisioning/provisioning-import.service'
  )
  const summary = await importProvisioningSpecification(spec)
  console.log(JSON.stringify({ ...summary, file: path }, null, 2))
  return 'import'
}

const mode = await main()
if (mode === 'import') {
  const { disconnectDb } = await import('@/db/client')
  await disconnectDb()
}
