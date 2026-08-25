'use client'

import { request } from './request'

export type OnboardingCompletion = {
  object: 'onboarding_completion'
  organization_id: string
  access_status: 'active'
}

export const onboarding = {
  createOrganization(params: { name?: string } = {}) {
    return request<OnboardingCompletion>('/api/onboarding/organization', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
}
