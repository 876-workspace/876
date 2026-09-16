import { request } from '../request'
import type { Runtime } from '../runtime'
import { myWorkSchema, type RequestOptions } from '../types'

export function createMyWorkResource(runtime: Runtime) {
  return {
    retrieve(
      organizationId: string,
      userId: string,
      options: RequestOptions = {}
    ) {
      const search = new URLSearchParams()
      search.set('userId', userId)
      return request(
        runtime,
        {
          method: 'GET',
          path: `/v1/organizations/${encodeURIComponent(organizationId)}/my-work?${search.toString()}`,
          signal: options.signal,
        },
        myWorkSchema
      )
    },
  }
}
