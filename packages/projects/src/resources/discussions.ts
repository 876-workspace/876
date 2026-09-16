import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  deletedSchema,
  discussionListSchema,
  discussionPostListSchema,
  discussionPostSchema,
  discussionSchema,
  visibilityResultSchema,
  type CreateDiscussionInput,
  type CreateDiscussionPostInput,
  type ListDiscussionsQuery,
  type RequestOptions,
  type UpdateDiscussionInput,
  type UpdateDiscussionPostInput,
} from '../types'

function root(organizationId: string, projectId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/discussions`
}

function toQueryString(params: ListDiscussionsQuery): string {
  const search = new URLSearchParams()
  if (typeof params.limit === 'number') search.set('limit', String(params.limit))
  if (params.startingAfter) search.set('starting_after', params.startingAfter)
  const query = search.toString()
  return query ? `?${query}` : ''
}

export function createDiscussionsResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      projectId: string,
      query: ListDiscussionsQuery & RequestOptions = {}
    ) {
      const { signal, ...params } = query
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId, projectId)}${toQueryString(params)}`,
          signal,
        },
        discussionListSchema
      )
    },
    create(
      organizationId: string,
      projectId: string,
      input: CreateDiscussionInput,
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
        discussionSchema
      )
    },
    retrieve(
      organizationId: string,
      projectId: string,
      discussionId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId, projectId)}/${encodeURIComponent(discussionId)}`,
          signal: options.signal,
        },
        discussionSchema
      )
    },
    update(
      organizationId: string,
      projectId: string,
      discussionId: string,
      input: UpdateDiscussionInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId, projectId)}/${encodeURIComponent(discussionId)}`,
          body: input,
          signal: options.signal,
        },
        discussionSchema
      )
    },
    delete(
      organizationId: string,
      projectId: string,
      discussionId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId, projectId)}/${encodeURIComponent(discussionId)}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
    setClientVisibility(
      organizationId: string,
      projectId: string,
      discussionId: string,
      clientVisible: boolean,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId, projectId)}/${encodeURIComponent(discussionId)}/client-visibility`,
          body: { clientVisible },
          signal: options.signal,
        },
        visibilityResultSchema
      )
    },
    listPosts(
      organizationId: string,
      projectId: string,
      discussionId: string,
      query: ListDiscussionsQuery & RequestOptions = {}
    ) {
      const { signal, ...params } = query
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId, projectId)}/${encodeURIComponent(discussionId)}/posts${toQueryString(params)}`,
          signal,
        },
        discussionPostListSchema
      )
    },
    createPost(
      organizationId: string,
      projectId: string,
      discussionId: string,
      input: CreateDiscussionPostInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId, projectId)}/${encodeURIComponent(discussionId)}/posts`,
          body: input,
          signal: options.signal,
        },
        discussionPostSchema
      )
    },
    updatePost(
      organizationId: string,
      projectId: string,
      discussionId: string,
      postId: string,
      input: UpdateDiscussionPostInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId, projectId)}/${encodeURIComponent(discussionId)}/posts/${encodeURIComponent(postId)}`,
          body: input,
          signal: options.signal,
        },
        discussionPostSchema
      )
    },
    deletePost(
      organizationId: string,
      projectId: string,
      discussionId: string,
      postId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId, projectId)}/${encodeURIComponent(discussionId)}/posts/${encodeURIComponent(postId)}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
  }
}
