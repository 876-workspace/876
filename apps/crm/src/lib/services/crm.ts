import 'server-only'

import { create876CrmServiceClient } from '@876/crm/service'

const baseUrl =
  process.env.CRM_API_URL?.trim() ||
  process.env.NEXT_PUBLIC_CRM_API_URL?.trim() ||
  'http://localhost:4010'
const internalKey = process.env.CRM_INTERNAL_KEY?.trim()

if (!internalKey) throw new Error('CRM_INTERNAL_KEY is required')

/** CRM's app-owned, server-only service client. The credential is static, so this client is a safe module singleton. */
export const crm = create876CrmServiceClient({ baseUrl, internalKey })
