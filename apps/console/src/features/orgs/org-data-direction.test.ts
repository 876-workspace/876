import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ORG_ROOT = join(process.cwd(), 'src/app/(app)/orgs/[slug]')

const SUPPORT = readFileSync(join(ORG_ROOT, 'support/(list)/page.tsx'), 'utf8')
const WORKSPACE_REQUESTS = readFileSync(
  join(ORG_ROOT, 'workspace/crm/requests/(list)/page.tsx'),
  'utf8'
)

/**
 * Console answers two opposite questions about an organization, and reading the
 * wrong tenant answers the wrong one while looking entirely correct:
 *
 * - `/orgs/[slug]/support` — what has this org raised **with us**? That lives in
 *   876's own tenant, filtered to the customer record representing the org.
 * - `/orgs/[slug]/workspace/crm` — what is this org doing **in CRM**? That lives
 *   in the organization's own tenant.
 *
 * Nothing else catches a swap: both call the same verb with an org id and both
 * type-check. These assertions are the guard.
 */
describe('org CRM surfaces read the tenant their name implies', () => {
  it('support reads 876s own tenant, not the organizations', () => {
    expect(SUPPORT).toContain('getPlatformOrganization')
    expect(SUPPORT).toContain('$876.requests.list(platformOrg.id')
  })

  it('support scopes to the customer record representing the organization', () => {
    expect(SUPPORT).toContain('resolveOrgCustomerWithUs')
    expect(SUPPORT).toMatch(/customerId: [A-Za-z.]*\bprofile\.id/)
  })

  it('the workspace reads the organizations own tenant', () => {
    expect(WORKSPACE_REQUESTS).toContain('$876.requests.list(org.id')
  })

  it('the workspace never reaches for the platform organization', () => {
    expect(WORKSPACE_REQUESTS).not.toContain('getPlatformOrganization')
  })

  it('support does not list the organizations own requests unfiltered', () => {
    expect(SUPPORT).not.toMatch(/\$876\.requests\.list\(org\.id/)
  })
})
