import type { ClientRequestInit } from '@876/core/client'
import type { z } from 'zod'

import { request } from './request'
import { buildRuntime, type Runtime } from './runtime'
import {
  portalActivityFeedSchema,
  portalCommentArraySchema,
  portalAttachmentListSchema,
  portalCommentSchema,
  portalDiscussionDetailSchema,
  portalDiscussionListSchema,
  portalInvoiceArraySchema,
  portalIssueListSchema,
  portalIssueSchema,
  portalMilestoneCommentArraySchema,
  portalMilestoneListSchema,
  portalMilestoneSchema,
  portalPhaseHoursArraySchema,
  portalWikiPageListSchema,
  portalWikiPageSchema,
  type PortalActivityQuery,
  type PortalClientOptions,
  type PortalListQuery,
  type RequestOptions,
} from './types'

function root(organizationId: string, projectId: string) {
  return `/portal/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}`
}

function toListQueryString(params: PortalListQuery): string {
  const search = new URLSearchParams()
  if (typeof params.limit === 'number') search.set('limit', String(params.limit))
  if (params.startingAfter) search.set('starting_after', params.startingAfter)
  const query = search.toString()
  return query ? `?${query}` : ''
}

function toActivityQueryString(params: PortalActivityQuery): string {
  const search = new URLSearchParams()
  if (typeof params.limit === 'number') search.set('limit', String(params.limit))
  if (params.cursor) search.set('cursor', params.cursor)
  const query = search.toString()
  return query ? `?${query}` : ''
}

type PortalRuntime = {
  runtime: Runtime
  actingUserId: string
}

function portalRequest<T>(
  portal: PortalRuntime,
  init: ClientRequestInit,
  dataSchema: z.ZodType<T>
) {
  return request(
    portal.runtime,
    { ...init, headers: { 'x-user-id': portal.actingUserId } },
    dataSchema
  )
}

export function create876ProjectsPortalClient(options: PortalClientOptions) {
  const portal: PortalRuntime = {
    runtime: buildRuntime(options),
    actingUserId: options.actingUserId,
  }
  const base = (organizationId: string, projectId: string) =>
    root(organizationId, projectId)
  return {
    listIssues(
      organizationId: string,
      projectId: string,
      query: PortalListQuery & RequestOptions = {}
    ) {
      const { signal, ...params } = query
      return portalRequest(
        portal,
        {
          method: 'GET',
          path: `${base(organizationId, projectId)}/issues${toListQueryString(params)}`,
          signal,
        },
        portalIssueListSchema
      )
    },
    retrieveIssue(
      organizationId: string,
      projectId: string,
      issueRef: string,
      options: RequestOptions = {}
    ) {
      return portalRequest(
        portal,
        {
          method: 'GET',
          path: `${base(organizationId, projectId)}/issues/${encodeURIComponent(issueRef)}`,
          signal: options.signal,
        },
        portalIssueSchema
      )
    },
    listIssueComments(
      organizationId: string,
      projectId: string,
      issueRef: string,
      options: RequestOptions = {}
    ) {
      return portalRequest(
        portal,
        {
          method: 'GET',
          path: `${base(organizationId, projectId)}/issues/${encodeURIComponent(issueRef)}/comments`,
          signal: options.signal,
        },
        portalCommentArraySchema
      )
    },
    listMilestones(
      organizationId: string,
      projectId: string,
      query: PortalListQuery & RequestOptions = {}
    ) {
      const { signal, ...params } = query
      return portalRequest(
        portal,
        {
          method: 'GET',
          path: `${base(organizationId, projectId)}/milestones${toListQueryString(params)}`,
          signal,
        },
        portalMilestoneListSchema
      )
    },
    retrieveMilestone(
      organizationId: string,
      projectId: string,
      milestoneId: string,
      options: RequestOptions = {}
    ) {
      return portalRequest(
        portal,
        {
          method: 'GET',
          path: `${base(organizationId, projectId)}/milestones/${encodeURIComponent(milestoneId)}`,
          signal: options.signal,
        },
        portalMilestoneSchema
      )
    },
    listMilestoneComments(
      organizationId: string,
      projectId: string,
      milestoneId: string,
      options: RequestOptions = {}
    ) {
      return portalRequest(
        portal,
        {
          method: 'GET',
          path: `${base(organizationId, projectId)}/milestones/${encodeURIComponent(milestoneId)}/comments`,
          signal: options.signal,
        },
        portalMilestoneCommentArraySchema
      )
    },
    listDiscussions(
      organizationId: string,
      projectId: string,
      query: PortalListQuery & RequestOptions = {}
    ) {
      const { signal, ...params } = query
      return portalRequest(
        portal,
        {
          method: 'GET',
          path: `${base(organizationId, projectId)}/discussions${toListQueryString(params)}`,
          signal,
        },
        portalDiscussionListSchema
      )
    },
    retrieveDiscussion(
      organizationId: string,
      projectId: string,
      discussionId: string,
      options: RequestOptions = {}
    ) {
      return portalRequest(
        portal,
        {
          method: 'GET',
          path: `${base(organizationId, projectId)}/discussions/${encodeURIComponent(discussionId)}`,
          signal: options.signal,
        },
        portalDiscussionDetailSchema
      )
    },
    listWikiPages(
      organizationId: string,
      projectId: string,
      query: PortalListQuery & RequestOptions = {}
    ) {
      const { signal, ...params } = query
      return portalRequest(
        portal,
        {
          method: 'GET',
          path: `${base(organizationId, projectId)}/wiki${toListQueryString(params)}`,
          signal,
        },
        portalWikiPageListSchema
      )
    },
    retrieveWikiPage(
      organizationId: string,
      projectId: string,
      pageRef: string,
      options: RequestOptions = {}
    ) {
      return portalRequest(
        portal,
        {
          method: 'GET',
          path: `${base(organizationId, projectId)}/wiki/${encodeURIComponent(pageRef)}`,
          signal: options.signal,
        },
        portalWikiPageSchema
      )
    },
    listAttachments(
      organizationId: string,
      projectId: string,
      query: PortalListQuery & RequestOptions = {}
    ) {
      const { signal, ...params } = query
      return portalRequest(
        portal,
        {
          method: 'GET',
          path: `${base(organizationId, projectId)}/attachments${toListQueryString(params)}`,
          signal,
        },
        portalAttachmentListSchema
      )
    },
    listActivity(
      organizationId: string,
      projectId: string,
      query: PortalActivityQuery & RequestOptions = {}
    ) {
      const { signal, ...params } = query
      return portalRequest(
        portal,
        {
          method: 'GET',
          path: `${base(organizationId, projectId)}/activity${toActivityQueryString(params)}`,
          signal,
        },
        portalActivityFeedSchema
      )
    },
    getTimeByPhase(
      organizationId: string,
      projectId: string,
      options: RequestOptions = {}
    ) {
      return portalRequest(
        portal,
        {
          method: 'GET',
          path: `${base(organizationId, projectId)}/time-by-phase`,
          signal: options.signal,
        },
        portalPhaseHoursArraySchema
      )
    },
    listInvoices(
      organizationId: string,
      projectId: string,
      options: RequestOptions = {}
    ) {
      return portalRequest(
        portal,
        {
          method: 'GET',
          path: `${base(organizationId, projectId)}/invoices`,
          signal: options.signal,
        },
        portalInvoiceArraySchema
      )
    },
  }
}

export type ProjectsPortalClient = ReturnType<
  typeof create876ProjectsPortalClient
>
