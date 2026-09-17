'use client'

import type {
  CloneProjectInput,
  InstantiateTemplateInput,
  PreviewTemplateInput,
  Project,
  ProjectTemplate,
  SaveAsTemplateInput,
  TemplatePreview,
} from '@876/projects/contracts'

import { request } from './request'

import type { UpdateTemplateParams } from '@/types/templates'

export type { UpdateTemplateParams }

function json(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }
}

/**
 * Template writes go through this app's own routes, which resolve the
 * organization and the acting user from the sealed session: the browser never
 * names either.
 */
export const templatesClient = {
  update(templateId: string, params: UpdateTemplateParams) {
    return request<ProjectTemplate>(
      `/api/project-templates/${encodeURIComponent(templateId)}`,
      { ...json(params), method: 'PATCH' }
    )
  },
  preview(templateId: string, params: PreviewTemplateInput) {
    return request<TemplatePreview>(
      `/api/project-templates/${encodeURIComponent(templateId)}/preview`,
      json(params)
    )
  },
  instantiate(templateId: string, params: InstantiateTemplateInput) {
    return request<Project>(
      `/api/project-templates/${encodeURIComponent(templateId)}/instantiate`,
      json(params)
    )
  },
  saveAsTemplate(projectId: string, params: SaveAsTemplateInput) {
    return request<ProjectTemplate>(
      `/api/projects/${encodeURIComponent(projectId)}/save-as-template`,
      json(params)
    )
  },
  cloneProject(projectId: string, params: CloneProjectInput) {
    return request<Project>(
      `/api/projects/${encodeURIComponent(projectId)}/clone`,
      json(params)
    )
  },
}
