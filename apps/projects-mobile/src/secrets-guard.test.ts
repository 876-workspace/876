import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const FORBIDDEN = [
  'PROJECTS_INTERNAL_KEY',
  'API_INTERNAL_KEY',
  'BILLING_INTERNAL_KEY',
  'client_secret',
  'clientSecret',
  '876_app_secret',
  'localhost:4030',
  'localhost:4000',
  'EXPO_PUBLIC_PROJECTS_API_URL',
]

function sources(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) out.push(...sources(path))
    else if (/\.(ts|tsx|json)$/.test(entry) && !entry.endsWith('.test.ts'))
      out.push(path)
  }
  return out
}

describe('no confidential credentials in the mobile bundle', () => {
  it('keeps server secrets and local API URLs out of app source', () => {
    const root = new URL('..', import.meta.url)
    const violations: string[] = []
    for (const file of sources(root.pathname)) {
      const body = readFileSync(file, 'utf8')
      for (const token of FORBIDDEN)
        if (body.includes(token)) violations.push(`${file}: ${token}`)
    }
    expect(violations).toEqual([])
  })
})
