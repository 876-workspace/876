import type { AppCreateParams, AppCreated } from '@876/account'

import { post } from '@/lib/client/request'

export const apps = {
  create: (params: AppCreateParams) =>
    post<AppCreated>('/api/developer/apps', params),
}
