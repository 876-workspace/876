'use client'

import { request } from './request'

import type { OnboardingCompletion } from '@/types/access'

export type { OnboardingCompletion }

export const onboarding = {
  createOrganization(params: { name?: string } = {}) {
    return request<OnboardingCompletion>('/api/onboarding/organization', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
}
