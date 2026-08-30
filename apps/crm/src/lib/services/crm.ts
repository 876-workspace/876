import 'server-only'

import {
  create876CrmServiceClient,
  type CrmServiceClient,
} from '@876/crm/service'

let serviceClient: CrmServiceClient | undefined

function getServiceClient() {
  if (serviceClient) return serviceClient

  const internalKey = process.env.CRM_INTERNAL_KEY?.trim()
  if (!internalKey) throw new Error('CRM_INTERNAL_KEY is required')

  const baseUrl =
    process.env.CRM_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_CRM_API_URL?.trim() ||
    'http://localhost:4010'
  serviceClient = create876CrmServiceClient({ baseUrl, internalKey })

  return serviceClient
}

/**
 * CRM's app-owned, server-only service client. Resource access initializes the
 * singleton at request time because OpenNext imports route modules before
 * runtime secrets are available.
 */
export const crm = {
  get customers() {
    return getServiceClient().customers
  },
  get requests() {
    return getServiceClient().requests
  },
  get requestNotes() {
    return getServiceClient().requestNotes
  },
  get teams() {
    return getServiceClient().teams
  },
  get requestCategories() {
    return getServiceClient().requestCategories
  },
  get requestPriorities() {
    return getServiceClient().requestPriorities
  },
  get requestTasks() {
    return getServiceClient().requestTasks
  },
  get requestReminders() {
    return getServiceClient().requestReminders
  },
  get requestEvents() {
    return getServiceClient().requestEvents
  },
  get requestForms() {
    return getServiceClient().requestForms
  },
  get requestFormSubmissions() {
    return getServiceClient().requestFormSubmissions
  },
  get requestFormRequests() {
    return getServiceClient().requestFormRequests
  },
}
