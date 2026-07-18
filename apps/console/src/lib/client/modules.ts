import type {
  AdminApplicationModule,
  AdminApplicationModuleCreateParams,
  AdminApplicationModuleUpdateParams,
  AdminDeletedApplicationModule,
} from '@876/admin'

import { request } from './request'

export const modules = {
  create(params: AdminApplicationModuleCreateParams) {
    return request<AdminApplicationModule>('/api/modules', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },
  update(moduleId: string, params: AdminApplicationModuleUpdateParams) {
    return request<AdminApplicationModule>(
      `/api/modules/${encodeURIComponent(moduleId)}`,
      { method: 'PATCH', body: JSON.stringify(params) }
    )
  },
  archive(moduleId: string) {
    return request<AdminDeletedApplicationModule>(
      `/api/modules/${encodeURIComponent(moduleId)}`,
      { method: 'DELETE' }
    )
  },
}
