'use client'

import type {
  EmailDomain,
  EmailDomainRecord,
} from '@876/communications/contracts'

import { request } from './request'

export const create = (params: { name: string }) =>
  request<EmailDomain>('/api/email-domains', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const verify = (domainId: string) =>
  request<EmailDomain>(
    `/api/email-domains/${encodeURIComponent(domainId)}/verify`,
    { method: 'POST' }
  )

export type { EmailDomain, EmailDomainRecord }

export const emailDomains = { create, verify }
