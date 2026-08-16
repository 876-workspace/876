'use client'

import { request } from './request'

/** The organization created (or reused) plus the activated Invoice access. */
export type OnboardingCompletion = {
  object: 'onboarding_completion'
  organization_id: string
  access_status: 'active'
}

export const onboarding = {
  /**
   * Activates 876 Invoice for the signed-in account's organization, creating
   * the organization first when there is none (`name` is required only then).
   */
  createOrganization(params: { name?: string } = {}) {
    return request<OnboardingCompletion>('/api/onboarding/organization', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
}
