import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  presetListSchema,
  type ApplyPresetInput,
  type RequestOptions,
} from '../types'
import { z } from 'zod'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/presets`
}

export function createPresetsResource(runtime: Runtime) {
  return {
    list(organizationId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        { method: 'GET', path: root(organizationId), signal: options.signal },
        presetListSchema
      )
    },
    apply(
      organizationId: string,
      input: ApplyPresetInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId)}/apply`,
          body: input,
          signal: options.signal,
        },
        z.null()
      )
    },
  }
}
