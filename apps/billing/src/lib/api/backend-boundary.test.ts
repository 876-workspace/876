import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const APP_ROOT = resolve(process.cwd())

describe('standalone Billing API boundary', () => {
  it('has no legacy Billing or admin route handlers', () => {
    const retiredRoots = [
      join(APP_ROOT, 'src/app/api/billing'),
      join(APP_ROOT, 'src/app/api/admin'),
    ]

    expect(retiredRoots.flatMap(findRouteHandlers)).toEqual([])
  })

  it('routes every versioned Billing operation through the FastAPI gateway', () => {
    const config = readFileSync(join(APP_ROOT, 'next.config.ts'), 'utf8')

    expect(config).toContain("source: '/api/v1/:path*'")
    expect(config).toContain("destination: '/api/billing-gateway/:path*'")
    expect(config).not.toContain("destination: '/api/admin/:path*'")
  })

  it('does not let the Billing UI run database migrations', () => {
    const packageJson = JSON.parse(
      readFileSync(join(APP_ROOT, 'package.json'), 'utf8')
    ) as { scripts: Record<string, string> }
    const railway = readFileSync(join(APP_ROOT, 'railway.toml'), 'utf8')

    expect(packageJson.scripts['db:migrate']).toBeUndefined()
    expect(packageJson.scripts['db:deploy']).toBeUndefined()
    expect(railway).not.toMatch(/prisma\s+migrate/)
  })
})

function findRouteHandlers(directory: string): string[] {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return findRouteHandlers(path)
    return entry.name === 'route.ts' ? [path] : []
  })
}
