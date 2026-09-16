import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  projectSchema,
  projectTemplateListSchema,
  projectTemplateSchema,
  projectTemplateVersionListSchema,
  templatePreviewSchema,
  type CreateProjectTemplateInput,
  type InstantiateTemplateInput,
  type PreviewTemplateInput,
  type Project,
  type ProjectTemplate,
  type RequestOptions,
  type Result,
  type TemplatePreview,
  type UpdateProjectTemplateInput,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/project-templates`
}

export function createProjectTemplatesResource(runtime: Runtime) {
  return {
    list(organizationId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'GET',
          path: root(organizationId),
          signal: options.signal,
        },
        projectTemplateListSchema
      )
    },
    create(
      organizationId: string,
      input: CreateProjectTemplateInput,
      options: RequestOptions = {}
    ): Promise<Result<ProjectTemplate>> {
      return request(
        runtime,
        {
          method: 'POST',
          path: root(organizationId),
          body: input,
          signal: options.signal,
        },
        projectTemplateSchema
      )
    },
    retrieve(
      organizationId: string,
      templateId: string,
      options: RequestOptions = {}
    ): Promise<Result<ProjectTemplate>> {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/${encodeURIComponent(templateId)}`,
          signal: options.signal,
        },
        projectTemplateSchema
      )
    },
    update(
      organizationId: string,
      templateId: string,
      input: UpdateProjectTemplateInput,
      options: RequestOptions = {}
    ): Promise<Result<ProjectTemplate>> {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId)}/${encodeURIComponent(templateId)}`,
          body: input,
          signal: options.signal,
        },
        projectTemplateSchema
      )
    },
    delete(
      organizationId: string,
      templateId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(templateId)}`,
          signal: options.signal,
        },
        projectTemplateSchema
      )
    },
    versions(organizationId: string, templateId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/${encodeURIComponent(templateId)}/versions`,
          signal: options.signal,
        },
        projectTemplateVersionListSchema
      )
    },
    preview(
      organizationId: string,
      templateId: string,
      input: PreviewTemplateInput,
      options: RequestOptions = {}
    ): Promise<Result<TemplatePreview>> {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId)}/${encodeURIComponent(templateId)}/preview`,
          body: input,
          signal: options.signal,
        },
        templatePreviewSchema
      )
    },
    instantiate(
      organizationId: string,
      templateId: string,
      input: InstantiateTemplateInput,
      options: RequestOptions = {}
    ): Promise<Result<Project>> {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId)}/${encodeURIComponent(templateId)}/instantiate`,
          body: input,
          signal: options.signal,
        },
        projectSchema
      )
    },
  }
}

export type ProjectTemplatesResource = ReturnType<
  typeof createProjectTemplatesResource
>
