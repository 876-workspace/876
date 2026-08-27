import { z } from 'zod'

import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  deletedSchema,
  teamListSchema,
  teamMemberListSchema,
  teamMemberSchema,
  teamSchema,
  type AddTeamMemberInput,
  type DeleteTeamInput,
  type ListTeamsQuery,
  type RequestOptions,
  type UpdateTeamInput,
  type UpdateTeamMemberInput,
  type CreateTeamInput,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/teams`
}

function toQueryString(params?: ListTeamsQuery): string {
  if (!params) return ''
  const search = new URLSearchParams()
  if (params.status) search.set('status', params.status)
  if (params.includeMembers) search.set('includeMembers', 'true')
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function createTeamsResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      options: ListTeamsQuery & RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}${toQueryString(options)}`,
          signal: options.signal,
        },
        teamListSchema
      )
    },
    retrieve(organizationId: string, id: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/${encodeURIComponent(id)}`,
          signal: options.signal,
        },
        teamSchema
      )
    },
    create(
      organizationId: string,
      input: CreateTeamInput,
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
        teamSchema
      )
    },
    update(
      organizationId: string,
      id: string,
      input: UpdateTeamInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId)}/${encodeURIComponent(id)}`,
          body: input,
          signal: options.signal,
        },
        teamSchema
      )
    },
    delete(
      organizationId: string,
      id: string,
      input: DeleteTeamInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(id)}`,
          body: input,
          signal: options.signal,
        },
        deletedSchema.extend({ object: z.literal('team') })
      )
    },
    members: {
      list(
        organizationId: string,
        teamId: string,
        options: RequestOptions = {}
      ) {
        return request(
          runtime,
          {
            method: 'GET',
            path: `${root(organizationId)}/${encodeURIComponent(teamId)}/members`,
            signal: options.signal,
          },
          teamMemberListSchema
        )
      },
      add(
        organizationId: string,
        teamId: string,
        input: AddTeamMemberInput,
        options: RequestOptions = {}
      ) {
        return request(
          runtime,
          {
            method: 'POST',
            path: `${root(organizationId)}/${encodeURIComponent(teamId)}/members`,
            body: input,
            signal: options.signal,
          },
          teamMemberSchema
        )
      },
      update(
        organizationId: string,
        teamId: string,
        userId: string,
        input: UpdateTeamMemberInput,
        options: RequestOptions = {}
      ) {
        return request(
          runtime,
          {
            method: 'PATCH',
            path: `${root(organizationId)}/${encodeURIComponent(teamId)}/members/${encodeURIComponent(userId)}`,
            body: input,
            signal: options.signal,
          },
          teamMemberSchema
        )
      },
      remove(
        organizationId: string,
        teamId: string,
        userId: string,
        options: RequestOptions = {}
      ) {
        return request(
          runtime,
          {
            method: 'DELETE',
            path: `${root(organizationId)}/${encodeURIComponent(teamId)}/members/${encodeURIComponent(userId)}`,
            signal: options.signal,
          },
          deletedSchema.extend({ object: z.literal('team_member') })
        )
      },
    },
  }
}
