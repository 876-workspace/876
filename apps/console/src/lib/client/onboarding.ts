import type {
  AdminOnboardingAnswersReplaceParams,
  AdminOnboardingCatalog,
  AdminOnboardingSession,
  AdminOnboardingValidation,
} from '@876/admin'

import { request } from './request'

const path = (organizationId: string) =>
  `/api/organizations/${encodeURIComponent(organizationId)}/onboarding`

export const onboarding = {
  retrieveCatalog(organizationId: string) {
    return request<AdminOnboardingCatalog>(`${path(organizationId)}/catalog`, {
      method: 'GET',
    })
  },
  retrieve(organizationId: string) {
    return request<AdminOnboardingSession>(path(organizationId), {
      method: 'GET',
    })
  },
  save(organizationId: string, body: AdminOnboardingAnswersReplaceParams) {
    return request<AdminOnboardingSession>(path(organizationId), {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  },
  validate(organizationId: string, body: AdminOnboardingAnswersReplaceParams) {
    return request<AdminOnboardingValidation>(
      `${path(organizationId)}/validate`,
      { method: 'POST', body: JSON.stringify(body) }
    )
  },
  submit(organizationId: string) {
    return request<AdminOnboardingSession>(`${path(organizationId)}/submit`, {
      method: 'POST',
    })
  },
}
