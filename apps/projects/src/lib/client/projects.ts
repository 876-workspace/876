'use client'

import type { Issue, Label, Project } from '@876/projects/contracts'

import { request } from './request'

export const projectsClient = {
  create(params: { name: string; key?: string; description?: string | null }) {
    return request<Project>('/api/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
}

export const issuesClient = {
  create(params: {
    title: string
    projectId?: string
    description?: string | null
  }) {
    return request<Issue>('/api/issues', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
}

export const labelsClient = {
  create(params: {
    name: string
    color?: string
    description?: string | null
  }) {
    return request<Label>('/api/labels', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
}
