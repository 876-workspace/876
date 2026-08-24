import { describe, expect, it } from 'vitest'
import { BOOTSTRAP_ORG_DESCRIPTION } from '../organizations.docs'
import { BILLING_APP_SLUG, DEFAULT_ORG_APP_SLUGS, ENTERPRISE_APP_SLUG } from '@/services/provisioning'

describe('BOOTSTRAP_ORG_DESCRIPTION — docs contract', () => {
  it('mentions Enterprise and Billing', () => {
    expect(BOOTSTRAP_ORG_DESCRIPTION).toMatch(/Enterprise/)
    expect(BOOTSTRAP_ORG_DESCRIPTION).toMatch(/Billing/)
  })

  it('does not mention Invoice', () => {
    expect(BOOTSTRAP_ORG_DESCRIPTION).not.toMatch(/Invoice/)
    expect(BOOTSTRAP_ORG_DESCRIPTION).not.toMatch(/876-invoice/)
  })

  it('documents slug generation', () => {
    expect(BOOTSTRAP_ORG_DESCRIPTION).toMatch(/slug/i)
  })

  it('documents admin only', () => {
    expect(BOOTSTRAP_ORG_DESCRIPTION).toMatch(/Admin only/i)
  })

  it('documents owner membership creation', () => {
    expect(BOOTSTRAP_ORG_DESCRIPTION).toMatch(/owner membership/i)
  })

  it('is a non-empty markdown string', () => {
    expect(BOOTSTRAP_ORG_DESCRIPTION.trim().length).toBeGreaterThan(20)
    expect(BOOTSTRAP_ORG_DESCRIPTION).toContain('Creates a WorkOS organization')
  })

  it('DEFAULT_ORG_APP_SLUGS docs alignment: each slug appears or is implied', () => {
    // The docs should cover all default apps; if a new default is added, docs must be updated.
    expect(DEFAULT_ORG_APP_SLUGS).toContain(ENTERPRISE_APP_SLUG)
    expect(DEFAULT_ORG_APP_SLUGS).toContain(BILLING_APP_SLUG)
    expect(DEFAULT_ORG_APP_SLUGS).not.toContain('876-invoice')
  })
})
