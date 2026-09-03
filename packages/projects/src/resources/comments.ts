import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  commentListSchema,
  commentSchema,
  deletedSchema,
  type CreateCommentInput,
  type ListCommentsQuery,
  type RequestOptions,
  type UpdateCommentInput,
} from '../types'

function root(organizationId: string, issueRef: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/issues/${encodeURIComponent(issueRef)}/comments`
}

function toQueryString(params?: ListCommentsQuery): string {
  if (!params) return ''
  const search = new URLSearchParams()
  if (typeof params.limit === 'number') {
    search.set('limit', String(params.limit))
  }
  if (params.startingAfter) search.set('starting_after', params.startingAfter)
  if (params.endingBefore) search.set('ending_before', params.endingBefore)
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function createCommentsResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      issueRef: string,
      query: ListCommentsQuery & RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId, issueRef)}${toQueryString(query)}`,
          signal: query.signal,
        },
        commentListSchema
      )
    },
    create(
      organizationId: string,
      issueRef: string,
      input: CreateCommentInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: root(organizationId, issueRef),
          body: input,
          signal: options.signal,
        },
        commentSchema
      )
    },
    update(
      organizationId: string,
      issueRef: string,
      commentId: string,
      input: UpdateCommentInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId, issueRef)}/${encodeURIComponent(commentId)}`,
          body: input,
          signal: options.signal,
        },
        commentSchema
      )
    },
    delete(
      organizationId: string,
      issueRef: string,
      commentId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId, issueRef)}/${encodeURIComponent(commentId)}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
  }
}
