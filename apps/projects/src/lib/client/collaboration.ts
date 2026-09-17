'use client'

import type {
  ClientGrant,
  Discussion,
  DiscussionPost,
  WikiPage,
} from '@876/projects'

import { request } from './request'

import type { FollowSubjectType } from '@/types/collaboration'

function followPath(subjectType: FollowSubjectType, subjectId: string): string {
  if (subjectType === 'project')
    return `/api/projects/${encodeURIComponent(subjectId)}/follow`
  if (subjectType === 'phase')
    return `/api/phases/${encodeURIComponent(subjectId)}/follow`
  return `/api/issues/${encodeURIComponent(subjectId)}/follow`
}

export const followsClient = {
  setFollowed(
    subjectType: FollowSubjectType,
    subjectId: string,
    following: boolean
  ) {
    return request<{ following: boolean }>(followPath(subjectType, subjectId), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ following }),
    })
  },
}

export const discussionsClient = {
  create(projectId: string, params: { title: string; body: string }) {
    return request<Discussion>(
      `/api/projects/${encodeURIComponent(projectId)}/discussions`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      }
    )
  },
  update(
    projectId: string,
    discussionId: string,
    params: { title?: string; pinned?: boolean; locked?: boolean }
  ) {
    return request<Discussion>(
      `/api/projects/${encodeURIComponent(projectId)}/discussions/${encodeURIComponent(discussionId)}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      }
    )
  },
  remove(projectId: string, discussionId: string) {
    return request<{ object: string; id: string; deleted: boolean }>(
      `/api/projects/${encodeURIComponent(projectId)}/discussions/${encodeURIComponent(discussionId)}`,
      { method: 'DELETE' }
    )
  },
  reply(projectId: string, discussionId: string, params: { body: string }) {
    return request<DiscussionPost>(
      `/api/projects/${encodeURIComponent(projectId)}/discussions/${encodeURIComponent(discussionId)}/posts`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      }
    )
  },
  setClientVisible(
    projectId: string,
    discussionId: string,
    clientVisible: boolean
  ) {
    return request<{ object: string; id: string; clientVisible: boolean }>(
      `/api/projects/${encodeURIComponent(projectId)}/discussions/${encodeURIComponent(discussionId)}/visibility`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientVisible }),
      }
    )
  },
}

export const wikiClient = {
  create(
    projectId: string,
    params: {
      title: string
      body: string
      slug?: string
      parentPageId?: string | null
    }
  ) {
    return request<WikiPage>(
      `/api/projects/${encodeURIComponent(projectId)}/wiki`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      }
    )
  },
  update(
    projectId: string,
    pageRef: string,
    params: { title?: string; body?: string; parentPageId?: string | null }
  ) {
    return request<WikiPage>(
      `/api/projects/${encodeURIComponent(projectId)}/wiki/${encodeURIComponent(pageRef)}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      }
    )
  },
  remove(projectId: string, pageRef: string) {
    return request<{ object: string; id: string; deleted: boolean }>(
      `/api/projects/${encodeURIComponent(projectId)}/wiki/${encodeURIComponent(pageRef)}`,
      { method: 'DELETE' }
    )
  },
  restore(projectId: string, pageRef: string, params: { revisionId: string }) {
    return request<WikiPage>(
      `/api/projects/${encodeURIComponent(projectId)}/wiki/${encodeURIComponent(pageRef)}/restore`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      }
    )
  },
}

export const clientGrantsClient = {
  invite(
    projectId: string,
    params: {
      userId: string
      allowComments?: boolean
      allowDiscussions?: boolean
      allowFiles?: boolean
      allowTime?: boolean
      allowInvoices?: boolean
      allowWiki?: boolean
    }
  ) {
    return request<ClientGrant>(
      `/api/projects/${encodeURIComponent(projectId)}/client-grants`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      }
    )
  },
  revoke(projectId: string, grantId: string) {
    return request<ClientGrant>(
      `/api/projects/${encodeURIComponent(projectId)}/client-grants/${encodeURIComponent(grantId)}/revoke`,
      { method: 'POST' }
    )
  },
  searchMembers(projectId: string, query: string, signal?: AbortSignal) {
    const search = new URLSearchParams({ q: query })
    return request<{ userId: string; label: string }[]>(
      `/api/projects/${encodeURIComponent(projectId)}/members?${search.toString()}`,
      { signal }
    )
  },
}

export const visibilityClient = {
  setIssueVisibility(issueRef: string, clientVisible: boolean) {
    return request<{ object: string; id: string; clientVisible: boolean }>(
      `/api/issues/${encodeURIComponent(issueRef)}/visibility`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientVisible }),
      }
    )
  },
  setPhaseVisibility(phaseId: string, clientVisible: boolean) {
    return request<{ object: string; id: string; clientVisible: boolean }>(
      `/api/phases/${encodeURIComponent(phaseId)}/visibility`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientVisible }),
      }
    )
  },
  setIssueCommentVisibility(
    issueRef: string,
    commentId: string,
    clientVisible: boolean
  ) {
    return request<{ object: string; id: string; clientVisible: boolean }>(
      `/api/issues/${encodeURIComponent(issueRef)}/comments/${encodeURIComponent(commentId)}/visibility`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientVisible }),
      }
    )
  },
  setPhaseCommentVisibility(
    phaseId: string,
    commentId: string,
    clientVisible: boolean
  ) {
    return request<{ object: string; id: string; clientVisible: boolean }>(
      `/api/phases/${encodeURIComponent(phaseId)}/comments/${encodeURIComponent(commentId)}/visibility`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientVisible }),
      }
    )
  },
}
