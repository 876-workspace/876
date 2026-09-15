import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  milestoneCommentListSchema,
  milestoneCommentSchema,
  milestoneCustomFieldListSchema,
  milestoneCustomFieldSchema,
  milestoneCustomFieldValueListSchema,
  milestoneDetailListSchema,
  milestoneDetailSchema,
  milestoneEventListSchema,
  milestoneSummarySchema,
  type CloneMilestoneInput,
  type CreateMilestoneCommentInput,
  type CreateMilestoneCustomFieldInput,
  type CreateMilestoneWithActorInput,
  type SetMilestoneCustomFieldsInput,
  type UpdateMilestoneCommentInput,
  type UpdateMilestoneCustomFieldInput,
  type UpdateMilestoneWithActorInput,
} from '../milestone-details'
import {
  deletedSchema,
  type MilestoneListParams,
  type RequestOptions,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/milestones`
}

function fieldsRoot(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/milestone-custom-fields`
}

function toQueryString(
  projectId: string,
  options: Omit<MilestoneListParams, 'projectId'>
) {
  const search = new URLSearchParams({ projectId })
  if (options.status) search.set('status', options.status)
  return `?${search.toString()}`
}

function allQueryString(status?: 'open' | 'completed' | 'canceled') {
  if (!status) return ''
  return `?${new URLSearchParams({ status }).toString()}`
}

export function createMilestonesResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      projectId: string,
      options: Omit<MilestoneListParams, 'projectId'> & RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}${toQueryString(projectId, options)}`,
          signal: options.signal,
        },
        milestoneDetailListSchema
      )
    },
    listAll(
      organizationId: string,
      options: {
        status?: 'open' | 'completed' | 'canceled'
        signal?: AbortSignal
      } = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/all${allQueryString(options.status)}`,
          signal: options.signal,
        },
        milestoneDetailListSchema
      )
    },
    create(
      organizationId: string,
      input: CreateMilestoneWithActorInput,
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
        milestoneDetailSchema
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
        milestoneDetailSchema
      )
    },
    update(
      organizationId: string,
      id: string,
      input: UpdateMilestoneWithActorInput,
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
        milestoneDetailSchema
      )
    },
    delete(organizationId: string, id: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(id)}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
    summary: {
      retrieve(
        organizationId: string,
        id: string,
        options: RequestOptions = {}
      ) {
        return request(
          runtime,
          {
            method: 'GET',
            path: `${root(organizationId)}/${encodeURIComponent(id)}/summary`,
            signal: options.signal,
          },
          milestoneSummarySchema
        )
      },
    },
    comments: {
      list(organizationId: string, id: string, options: RequestOptions = {}) {
        return request(
          runtime,
          {
            method: 'GET',
            path: `${root(organizationId)}/${encodeURIComponent(id)}/comments`,
            signal: options.signal,
          },
          milestoneCommentListSchema
        )
      },
      create(
        organizationId: string,
        id: string,
        input: CreateMilestoneCommentInput,
        options: RequestOptions = {}
      ) {
        return request(
          runtime,
          {
            method: 'POST',
            path: `${root(organizationId)}/${encodeURIComponent(id)}/comments`,
            body: input,
            signal: options.signal,
          },
          milestoneCommentSchema
        )
      },
      update(
        organizationId: string,
        id: string,
        commentId: string,
        input: UpdateMilestoneCommentInput,
        options: RequestOptions = {}
      ) {
        return request(
          runtime,
          {
            method: 'PATCH',
            path: `${root(organizationId)}/${encodeURIComponent(id)}/comments/${encodeURIComponent(commentId)}`,
            body: input,
            signal: options.signal,
          },
          milestoneCommentSchema
        )
      },
      delete(
        organizationId: string,
        id: string,
        commentId: string,
        actorUserId: string,
        options: RequestOptions = {}
      ) {
        const query = new URLSearchParams({ actorUserId })
        return request(
          runtime,
          {
            method: 'DELETE',
            path: `${root(organizationId)}/${encodeURIComponent(id)}/comments/${encodeURIComponent(commentId)}?${query.toString()}`,
            signal: options.signal,
          },
          deletedSchema
        )
      },
    },
    events: {
      list(organizationId: string, id: string, options: RequestOptions = {}) {
        return request(
          runtime,
          {
            method: 'GET',
            path: `${root(organizationId)}/${encodeURIComponent(id)}/events`,
            signal: options.signal,
          },
          milestoneEventListSchema
        )
      },
    },
    customFields: {
      list(organizationId: string, options: RequestOptions = {}) {
        return request(
          runtime,
          {
            method: 'GET',
            path: fieldsRoot(organizationId),
            signal: options.signal,
          },
          milestoneCustomFieldListSchema
        )
      },
      create(
        organizationId: string,
        input: CreateMilestoneCustomFieldInput,
        options: RequestOptions = {}
      ) {
        return request(
          runtime,
          {
            method: 'POST',
            path: fieldsRoot(organizationId),
            body: input,
            signal: options.signal,
          },
          milestoneCustomFieldSchema
        )
      },
      update(
        organizationId: string,
        fieldId: string,
        input: UpdateMilestoneCustomFieldInput,
        options: RequestOptions = {}
      ) {
        return request(
          runtime,
          {
            method: 'PATCH',
            path: `${fieldsRoot(organizationId)}/${encodeURIComponent(fieldId)}`,
            body: input,
            signal: options.signal,
          },
          milestoneCustomFieldSchema
        )
      },
      delete(
        organizationId: string,
        fieldId: string,
        options: RequestOptions = {}
      ) {
        return request(
          runtime,
          {
            method: 'DELETE',
            path: `${fieldsRoot(organizationId)}/${encodeURIComponent(fieldId)}`,
            signal: options.signal,
          },
          deletedSchema
        )
      },
      values: {
        list(organizationId: string, id: string, options: RequestOptions = {}) {
          return request(
            runtime,
            {
              method: 'GET',
              path: `${root(organizationId)}/${encodeURIComponent(id)}/custom-field-values`,
              signal: options.signal,
            },
            milestoneCustomFieldValueListSchema
          )
        },
        set(
          organizationId: string,
          id: string,
          input: SetMilestoneCustomFieldsInput,
          options: RequestOptions = {}
        ) {
          return request(
            runtime,
            {
              method: 'PUT',
              path: `${root(organizationId)}/${encodeURIComponent(id)}/custom-field-values`,
              body: input,
              signal: options.signal,
            },
            milestoneCustomFieldValueListSchema
          )
        },
      },
    },
    clone(
      organizationId: string,
      id: string,
      input: CloneMilestoneInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId)}/${encodeURIComponent(id)}/clone`,
          body: input,
          signal: options.signal,
        },
        milestoneDetailSchema
      )
    },
  }
}
