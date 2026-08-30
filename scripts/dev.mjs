import { spawn } from 'node:child_process'

const [target] = process.argv.slice(2)
const scripts = {
  crm: 'dev:crm',
  work: 'dev:work',
}

if (target === '--help' || target === '-h') {
  console.log('Usage: pnpm dev [crm|work]')
  console.log('\nTargets:')
  console.log('  crm   Start 876 CRM and its required services.')
  console.log('  work  Start the shared 876 Work service.')
  process.exit(0)
}

if (target && !scripts[target]) {
  console.error(`Unknown development target: ${target}`)
  console.error('Run `pnpm dev --help` for available targets.')
  process.exit(1)
}

const child = spawn('pnpm', ['run', target ? scripts[target] : 'dev:default'], {
  stdio: 'inherit',
})

child.on('error', (error) => {
  console.error('Unable to start pnpm:', error.message)
  process.exitCode = 1
})

child.on('close', (code) => {
  process.exitCode = code ?? 1
})
