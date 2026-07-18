import type {
  SwitchOrganizationInput,
  SwitchOrganizationResult,
} from '@/types/auth'

import { request } from './request'

const switchOrganization = (params: SwitchOrganizationInput) =>
  request<SwitchOrganizationResult>('/api/auth/switch-org', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const auth = { switchOrganization }
