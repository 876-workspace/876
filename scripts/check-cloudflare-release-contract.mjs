import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { CLOUDFLARE_WORKERS } from './cloudflare-release-contract.mjs'

const appDirectories = readdirSync('apps', { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join('apps', entry.name))

const discovered = new Map()
const errors = []
const deployWorkflow = readFileSync(
  '.github/workflows/deploy-cloudflare.yml',
  'utf8'
)

for (const directory of appDirectories) {
  const wranglerPath = path.join(directory, 'wrangler.jsonc')
  let source
  try {
    source = readFileSync(wranglerPath, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') continue
    throw error
  }

  const name = source.match(/"name"\s*:\s*"([^"]+)"/)?.[1]
  if (!name) {
    errors.push(`${wranglerPath}: missing a literal Worker name.`)
    continue
  }
  if (discovered.has(name))
    errors.push(`${wranglerPath}: duplicates Worker ${name}.`)

  discovered.set(name, directory)
}

const allowedMigrationOwners = new Set(['alembic', 'none', 'prisma'])

for (const [worker, directory] of discovered) {
  const contract = CLOUDFLARE_WORKERS[worker]
  if (!contract) {
    errors.push(
      `${directory}/wrangler.jsonc: ${worker} is missing from scripts/cloudflare-release-contract.mjs.`
    )
    continue
  }
  if (contract.directory !== directory)
    errors.push(
      `${worker}: contract directory ${contract.directory} does not match ${directory}.`
    )

  const appName = path.basename(directory)
  const jobName = appName === '876' ? 'app' : appName
  const jobMatch = deployWorkflow.match(
    new RegExp(
      `^  ${jobName}:[\\s\\S]*?(?=^  [a-z][a-z0-9-]*:|(?![\\s\\S]))`,
      'm'
    )
  )
  if (!jobMatch)
    errors.push(`${worker}: deploy workflow is missing the ${jobName} job.`)
  if (!deployWorkflow.includes(`          - ${jobName}`))
    errors.push(
      `${worker}: deploy workflow_dispatch is missing the ${jobName} option.`
    )
  if (jobMatch && !jobMatch[0].includes('name: Verify runtime secrets'))
    errors.push(`${worker}: deploy job does not verify runtime secrets.`)
  if (jobMatch && !jobMatch[0].includes('name: Verify production readiness'))
    errors.push(`${worker}: deploy job does not verify production readiness.`)
  if (
    jobMatch &&
    contract.migrationOwner !== 'none' &&
    !jobMatch[0].includes('name: Apply migrations')
  )
    errors.push(
      `${worker}: ${contract.migrationOwner} migration owner has no migration step.`
    )
}

for (const [worker, contract] of Object.entries(CLOUDFLARE_WORKERS)) {
  if (!discovered.has(worker))
    errors.push(`${worker}: release contract has no matching wrangler.jsonc.`)
  if (!allowedMigrationOwners.has(contract.migrationOwner))
    errors.push(`${worker}: migrationOwner must be alembic, prisma, or none.`)
  if (!contract.readinessUrl.startsWith('https://'))
    errors.push(`${worker}: readinessUrl must use HTTPS.`)
  if (!Array.isArray(contract.requiredSecrets))
    errors.push(`${worker}: requiredSecrets must be an explicit array.`)

  for (const dependency of contract.dependencies) {
    if (!CLOUDFLARE_WORKERS[dependency])
      errors.push(`${worker}: unknown dependency ${dependency}.`)
  }
}

if (errors.length > 0) {
  console.error(
    ['Cloudflare release contract failed:', ...errors].join('\n  - ')
  )
  process.exit(1)
}

console.log(
  `Cloudflare release contract covers all ${discovered.size} Workers.`
)
