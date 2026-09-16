import { callerHeaders } from '../caller-headers'
import { storageRequest } from '../request'
import type { StorageRuntime } from '../runtime'
import type { FileCallerAssertion } from '../types/files'
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

/**
 * `$876.storage.resourceLinks.*` — typed associations between files and app resources.
 *
 * Every one of these operations resolves a file by id on the service side, and
 * Storage refuses a non-public file unless the calling app names the principal
 * it acts for. A link to an `organization`-audience file is therefore
 * unreadable — and unremovable — without a `caller`.
 */
export function createResourceLinksResource(runtime: StorageRuntime) {
  return {
    /**
     * Associates a file with one of the calling app's records.
     *
     * @param params - File, app, resource, relation, owner, and actor.
     * @param caller - The app and principal this request is made on behalf of.
     *
     * @example
     * // Errors are values, never thrown. Common codes:
     * //   storage/file-not-found       unknown, or not disclosable to this caller
     * //   storage/file-not-ready       the upload session was never completed
     * //   storage/forbidden            the declared owner is not the file's owner
     */
    create(params: ResourceLinkCreateParams, caller: FileCallerAssertion) {
      return storageRequest<ResourceLink>(
        runtime,
        {
          method: 'POST',
          path: '/v1/resource-links',
          body: params,
          headers: callerHeaders(caller),
        },
        resourceLinkSchema
      )
    },

    /**
     * Lists a record's links.
     *
     * A link whose file this caller may not read is filtered out rather than
     * denied, so an empty list and a list this caller cannot see are the same
     * answer by design.
     */
    list(params: ResourceLinkListParams, caller: FileCallerAssertion) {
      const search = new URLSearchParams({
        app_id: params.app_id,
        resource_type: params.resource_type,
        resource_id: params.resource_id,
      })
      if (params.relation) search.set('relation', params.relation)

      return storageRequest<ResourceLinkList>(
        runtime,
        {
          method: 'GET',
          path: `/v1/resource-links?${search.toString()}`,
          headers: callerHeaders(caller),
        },
        resourceLinkListSchema
      )
    },

    /**
     * Removes a link. The file and its bytes are untouched.
     *
     * One opaque error covers "no such link" and "not yours" alike, so an
     * unknown id is indistinguishable from a link this caller may not remove.
     */
    delete(linkId: string, caller: FileCallerAssertion) {
      return storageRequest<DeletedResourceLink>(
        runtime,
        {
          method: 'DELETE',
          path: `/v1/resource-links/${encodeURIComponent(linkId)}`,
          headers: callerHeaders(caller),
        },
        deletedResourceLinkSchema
      )
    },
  }
}
