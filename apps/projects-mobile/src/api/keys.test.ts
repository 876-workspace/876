import { describe, expect, it } from 'vitest'

import { scopeKeys } from './keys'

describe('query keys', () => {
  it('scopes every key by organization', () => {
    expect(scopeKeys.projects('org_1')).toEqual(['org', 'org_1', 'projects'])
    expect(scopeKeys.issues('org_1')).toContain('org_1')
    expect(scopeKeys.notifications('org_1', 'user_1')).toContain('org_1')
    expect(scopeKeys.myWork('org_1', 'user_1')).toContain('org_1')
  })

  it('isolates organizations so a switch cannot reuse cached rows', () => {
    expect(scopeKeys.projects('org_1')).not.toEqual(
      scopeKeys.projects('org_2')
    )
    expect(scopeKeys.myWork('org_1', 'user_1')).not.toEqual(
      scopeKeys.myWork('org_2', 'user_1')
    )
  })
})
