import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  createEmailDomainSchema,
  deletedEmailDomainSchema,
  emailDomainListSchema,
  emailDomainSchema,
  type CreateEmailDomainInput,
  type RequestOptions,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/email/domains`
}

export function createDomainsResource(runtime: Runtime) {
  return {
    list(organizationId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'GET',
          path: root(organizationId),
          signal: options.signal,
        },
        emailDomainListSchema
      )
    },
    create(
      organizationId: string,
      input: CreateEmailDomainInput,
      options: RequestOptions = {}
    ) {
      const parsed = createEmailDomainSchema.parse(input)
      return request(
        runtime,
        {
          method: 'POST',
          path: root(organizationId),
          body: parsed,
          signal: options.signal,
        },
        emailDomainSchema
      )
    },
    retrieve(
      organizationId: string,
      domainId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/${encodeURIComponent(domainId)}`,
          signal: options.signal,
        },
        emailDomainSchema
      )
    },
    verify(
      organizationId: string,
      domainId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId)}/${encodeURIComponent(domainId)}/verify`,
          signal: options.signal,
        },
        emailDomainSchema
      )
    },
    refresh(
      organizationId: string,
      domainId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId)}/${encodeURIComponent(domainId)}/refresh`,
          signal: options.signal,
        },
        emailDomainSchema
      )
    },
    delete(
      organizationId: string,
      domainId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(domainId)}`,
          signal: options.signal,
          headers: options.actorId ? { 'x-actor-id': options.actorId } : undefined,
        },
        deletedEmailDomainSchema
      )
    },
  }
}
