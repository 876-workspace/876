import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  followerListSchema,
  followerSchema,
  unfollowResultSchema,
  type FollowInput,
  type ListFollowersQuery,
  type RequestOptions,
  type UnfollowInput,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/followers`
}

function toQueryString(params: ListFollowersQuery): string {
  const search = new URLSearchParams()
  search.set('subjectType', params.subjectType)
  search.set('subjectId', params.subjectId)
  if (typeof params.limit === 'number') search.set('limit', String(params.limit))
  if (params.startingAfter) search.set('starting_after', params.startingAfter)
  return `?${search.toString()}`
}

function toUnfollowQueryString(params: UnfollowInput): string {
  const search = new URLSearchParams()
  search.set('subjectType', params.subjectType)
  search.set('subjectId', params.subjectId)
  search.set('userId', params.userId)
  return `?${search.toString()}`
}

export function createFollowersResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      query: ListFollowersQuery & RequestOptions
    ) {
      const { signal, ...params } = query
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}${toQueryString(params)}`,
          signal,
        },
        followerListSchema
      )
    },
    follow(
      organizationId: string,
      input: FollowInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: root(organizationId),
          body: input,
          signal: options.signal,
        },
        followerSchema
      )
    },
    unfollow(
      organizationId: string,
      input: UnfollowInput & RequestOptions
    ) {
      const { signal, ...params } = input
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}${toUnfollowQueryString(params)}`,
          signal,
        },
        unfollowResultSchema
      )
    },
  }
}
