import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')
const dataSource = readFileSync(new URL('../_data.ts', import.meta.url), 'utf8')

describe('organization members loading strategy', () => {
  it('keeps the route chrome synchronous', () => {
    expect(pageSource).toContain(
      'export default function OrganizationMembersPage'
    )
    expect(pageSource).not.toContain(
      'export default async function OrganizationMembersPage'
    )
  })

  it('uses the cached canonical admin organization member directory', () => {
    expect(dataSource).toContain('export const resolveOrgMembers = cache')
    expect(dataSource).toContain('workspace.members.list(orgId')
    expect(dataSource).not.toContain('workspace.memberships.list')
  })

  it('does not rebuild the roster with a second users request', () => {
    expect(pageSource).toMatch(/resolveOrgMembers\([\w.]+\.id\)/)
    expect(pageSource).not.toContain('workspace.memberships.list')
    expect(pageSource).not.toContain('platform.users.list')
  })

  it('streams invites outside the member table critical path', () => {
    const membersStart = pageSource.indexOf('async function MembersTableData')
    const invitesStart = pageSource.indexOf('async function PendingInvitesData')

    expect(membersStart).toBeGreaterThan(-1)
    expect(invitesStart).toBeGreaterThan(membersStart)

    const memberLoader = pageSource.slice(membersStart, invitesStart)
    expect(memberLoader).not.toContain('workspace.invites.list')
    expect(pageSource).toContain(
      '<PendingInvitesData params={params} searchParams={searchParams} />'
    )
  })
})
