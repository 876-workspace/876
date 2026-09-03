import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(process.cwd(), 'src/app/(app)')

const PAGES = [
  'workspace/[orgSlug]/crm/requests/(list)/page.tsx',
  'requests/(list)/page.tsx',
]

/**
 * A CRM page has to tell two failures apart.
 *
 * `crm/tenant-not-found` means the organization has never used CRM — a state,
 * shown as an empty state. Anything else, "CRM API could not be reached"
 * especially, is an infrastructure failure and must stay visible as a failure:
 * rendering an outage as "no requests" would report every organization as empty
 * whenever CRM is down.
 *
 * The failure is surfaced as an `AppError` notice beside the still-mounted page
 * chrome rather than thrown at the error boundary (`.claude/rules/error-handling.md`),
 * so this asserts the notice is rendered, not that the page throws.
 */
describe('CRM pages distinguish a missing workspace from a failure', () => {
  for (const page of PAGES) {
    const source = readFileSync(join(ROOT, page), 'utf8')

    it(`${page} renders an empty state for a missing workspace`, () => {
      expect(source).toContain("'crm/tenant-not-found'")
      expect(source).toContain('<NoCrmWorkspace />')
    })

    it(`${page} surfaces every other error as a visible notice`, () => {
      expect(source).toContain("from '@876/ui/app-error'")
      expect(source).toMatch(/<AppError\b/)
    })

    it(`${page} never re-throws a returned application error`, () => {
      expect(source).not.toMatch(/throw new Error\([A-Za-z]+\.error/)
    })

    it(`${page} does not swallow errors generically`, () => {
      expect(source).not.toMatch(/catch\s*\([\w\s]*\)\s*\{\s*return/)
    })
  }
})
