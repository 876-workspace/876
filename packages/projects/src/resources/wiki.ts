import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  deletedSchema,
  wikiPageListSchema,
  wikiPageSchema,
  wikiRevisionListSchema,
  wikiRevisionSchema,
  type CreateWikiPageInput,
  type ListWikiPagesQuery,
  type RequestOptions,
  type RestoreWikiRevisionInput,
  type UpdateWikiPageInput,
} from '../types'

function root(organizationId: string, projectId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/wiki`
}

function toQueryString(params: ListWikiPagesQuery): string {
  const search = new URLSearchParams()
  if (typeof params.limit === 'number') search.set('limit', String(params.limit))
  if (params.startingAfter) search.set('starting_after', params.startingAfter)
  if (params.parentPageId !== undefined && params.parentPageId !== null)
    search.set('parentPageId', params.parentPageId)
  const query = search.toString()
  return query ? `?${query}` : ''
}

export function createWikiResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      projectId: string,
      query: ListWikiPagesQuery & RequestOptions = {}
    ) {
      const { signal, ...params } = query
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId, projectId)}${toQueryString(params)}`,
          signal,
        },
        wikiPageListSchema
      )
    },
    create(
      organizationId: string,
      projectId: string,
      input: CreateWikiPageInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: root(organizationId, projectId),
          body: input,
          signal: options.signal,
        },
        wikiPageSchema
      )
    },
    retrieve(
      organizationId: string,
      projectId: string,
      pageRef: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId, projectId)}/${encodeURIComponent(pageRef)}`,
          signal: options.signal,
        },
        wikiPageSchema
      )
    },
    update(
      organizationId: string,
      projectId: string,
      pageRef: string,
      input: UpdateWikiPageInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId, projectId)}/${encodeURIComponent(pageRef)}`,
          body: input,
          signal: options.signal,
        },
        wikiPageSchema
      )
    },
    delete(
      organizationId: string,
      projectId: string,
      pageRef: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId, projectId)}/${encodeURIComponent(pageRef)}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
    listRevisions(
      organizationId: string,
      projectId: string,
      pageRef: string,
      query: { limit?: number; startingAfter?: string } & RequestOptions = {}
    ) {
      const search = new URLSearchParams()
      if (typeof query.limit === 'number') search.set('limit', String(query.limit))
      if (query.startingAfter) search.set('starting_after', query.startingAfter)
      const suffix = search.toString() ? `?${search.toString()}` : ''
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId, projectId)}/${encodeURIComponent(pageRef)}/revisions${suffix}`,
          signal: query.signal,
        },
        wikiRevisionListSchema
      )
    },
    retrieveRevision(
      organizationId: string,
      projectId: string,
      pageRef: string,
      revisionId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId, projectId)}/${encodeURIComponent(pageRef)}/revisions/${encodeURIComponent(revisionId)}`,
          signal: options.signal,
        },
        wikiRevisionSchema
      )
    },
    restore(
      organizationId: string,
      projectId: string,
      pageRef: string,
      input: RestoreWikiRevisionInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId, projectId)}/${encodeURIComponent(pageRef)}/restore`,
          body: input,
          signal: options.signal,
        },
        wikiPageSchema
      )
    },
  }
}
