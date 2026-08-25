import 'server-only'

import { redirect } from 'next/navigation'

import { getCrmContextResult } from '@/lib/auth/context'
import { crmApi } from '@/lib/crm-api'
import type { CrmCustomer } from '@/types/crm'

async function requireContext() {
  const result = await getCrmContextResult()
  if (result.status === 'signed-out') redirect('/login')
  if (result.status === 'no-organization') redirect('/onboarding')
  if (result.status !== 'ok') redirect('/unavailable')
  return result.context
}

export async function listCustomers(): Promise<CrmCustomer[]> {
  const context = await requireContext()
  const response = await crmApi(
    `/v1/organizations/${encodeURIComponent(context.orgId)}/customers`
  )
  if (!response.ok) throw new Error('CRM customers could not be loaded.')
  const body = (await response.json()) as { data?: CrmCustomer[] }
  return body.data ?? []
}

export async function retrieveCustomer(id: string): Promise<CrmCustomer | null> {
  const context = await requireContext()
  const response = await crmApi(
    `/v1/organizations/${encodeURIComponent(context.orgId)}/customers/${encodeURIComponent(id)}`
  )
  if (response.status === 404) return null
  if (!response.ok) throw new Error('CRM customer could not be loaded.')
  const body = (await response.json()) as { data?: CrmCustomer }
  return body.data ?? null
}
