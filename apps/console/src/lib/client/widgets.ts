import type { AdminFeature } from '@876/admin'

import { request } from './request'
import type { WidgetFeatureUpdate } from '@/types/widgets'

export const updateFeature = (featureId: string, params: WidgetFeatureUpdate) =>
  request<AdminFeature>(
    `/api/widgets/features/${encodeURIComponent(featureId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(params),
    }
  )

export const widgets = { updateFeature }
