import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(process.cwd(), 'src/app/(app)')

const PAGES = [
  'orgs/[slug]/requests/(list)/page.tsx',
  'orgs/[slug]/requests/[requestId]/page.tsx',
  'support/(list)/page.tsx',
]

/**
 * A CRM page has to tell two failures apart.
 *
 * `crm/tenant-not-found` means the organization has never used CRM — a state,
 * shown as an empty state. Anything else, "CRM API could not be reached"
 * especially, is an infrastructure failure and must reach the error boundary:
 * rendering an outage as "no requests" would report every organization as empty
 * whenever CRM is down.
 */
describe('CRM pages distinguish a missing workspace from a failure', () => {
  for (const page of PAGES) {
    const source = readFileSync(join(ROOT, page), 'utf8')

    it(`${page} renders an empty state for a missing workspace`, () => {
      expect(source).toContain("'crm/tenant-not-found'")
      expect(source).toContain('<NoCrmWorkspace />')
    })

    it(`${page} still throws every other error`, () => {
      expect(source).toMatch(/if \([A-Za-z]+\.error\) throw new Error\(/)
    })

    it(`${page} does not swallow errors generically`, () => {
      expect(source).not.toMatch(/catch\s*\([\w\s]*\)\s*\{\s*return/)
    })
  }
})
