import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  createEmailTemplateSchema,
  deletedEmailTemplateSchema,
  emailCompositionSchema,
  emailTemplateListSchema,
  emailTemplateSchema,
  renderEmailTemplateSchema,
  updateEmailTemplateSchema,
  type CreateEmailTemplateInput,
  type RenderEmailTemplateInput,
  type RequestOptions,
  type UpdateEmailTemplateInput,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/email/templates`
}

export function createTemplatesResource(runtime: Runtime) {
  return {
    list(organizationId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'GET',
          path: root(organizationId),
          signal: options.signal,
        },
        emailTemplateListSchema
      )
    },
    create(
      organizationId: string,
      input: CreateEmailTemplateInput,
      options: RequestOptions = {}
    ) {
      const parsed = createEmailTemplateSchema.parse(input)
      return request(
        runtime,
        {
          method: 'POST',
          path: root(organizationId),
          body: parsed,
          signal: options.signal,
        },
        emailTemplateSchema
      )
    },
    resolve(
      organizationId: string,
      category: string,
      options: RequestOptions & { templateId?: string } = {}
    ) {
      const query = new URLSearchParams({ category })
      if (options.templateId) query.set('templateId', options.templateId)
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/resolve?${query.toString()}`,
          signal: options.signal,
        },
        emailTemplateSchema
      )
    },
    retrieve(
      organizationId: string,
      templateId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/${encodeURIComponent(templateId)}`,
          signal: options.signal,
        },
        emailTemplateSchema
      )
    },
    update(
      organizationId: string,
      templateId: string,
      input: UpdateEmailTemplateInput,
      options: RequestOptions = {}
    ) {
      const parsed = updateEmailTemplateSchema.parse(input)
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId)}/${encodeURIComponent(templateId)}`,
          body: parsed,
          signal: options.signal,
        },
        emailTemplateSchema
      )
    },
    render(
      organizationId: string,
      templateId: string,
      input: RenderEmailTemplateInput,
      options: RequestOptions = {}
    ) {
      const parsed = renderEmailTemplateSchema.parse(input)
      return request(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId)}/${encodeURIComponent(templateId)}/render`,
          body: parsed,
          signal: options.signal,
        },
        emailCompositionSchema
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
          headers: options.actorId ? { 'x-actor-id': options.actorId } : undefined,
        },
        deletedEmailTemplateSchema
      )
    },
  }
}
