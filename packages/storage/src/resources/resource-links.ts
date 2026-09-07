import { storageRequest } from '../request'
import type { StorageRuntime } from '../runtime'
import {
  deletedResourceLinkSchema,
  resourceLinkListSchema,
  resourceLinkSchema,
  type DeletedResourceLink,
  type ResourceLink,
  type ResourceLinkCreateParams,
  type ResourceLinkList,
  type ResourceLinkListParams,
} from '../types/resource-links'

/** `$876.storage.resourceLinks.*` — typed associations between files and app resources. */
export function createResourceLinksResource(runtime: StorageRuntime) {
  return {
    create(params: ResourceLinkCreateParams) {
      return storageRequest<ResourceLink>(
        runtime,
        { method: 'POST', path: '/v1/resource-links', body: params },
        resourceLinkSchema
      )
    },

    list(params: ResourceLinkListParams) {
      const search = new URLSearchParams({
        app_id: params.app_id,
        resource_type: params.resource_type,
        resource_id: params.resource_id,
      })
      if (params.relation) search.set('relation', params.relation)

      return storageRequest<ResourceLinkList>(
        runtime,
        { method: 'GET', path: `/v1/resource-links?${search.toString()}` },
        resourceLinkListSchema
      )
    },

    delete(linkId: string) {
      return storageRequest<DeletedResourceLink>(
        runtime,
        {
          method: 'DELETE',
          path: `/v1/resource-links/${encodeURIComponent(linkId)}`,
        },
        deletedResourceLinkSchema
      )
    },
  }
}
