import type { RequestStatus } from '@876/crm/contracts'

export { requestChannelSchema } from '@876/crm/contracts'
export type {
  CreateRequestInput,
  CreateRequestNoteInput,
  CrmRequest,
  CrmRequestNote,
  DeleteRequestNoteInput,
  ListRequestNotesInput,
  RequestChannel,
  RequestNoteKind,
  RequestNoteVisibility,
  RequestStatus,
  UpdateRequestInput,
  UpdateRequestNoteInput,
} from '@876/crm/contracts'

/** API-internal filters keep nullable values because repository callers use null as an explicit selector. */
export interface ListRequestsFilter {
  status?: RequestStatus
  teamId?: string | null
  assigneeId?: string | null
  customerId?: string
  categoryId?: string | null
  subcategoryId?: string | null
  ownerId?: string | null
  priorityId?: string
  requesterUserId?: string | null
  relatedResourceType?: RelatedResourceType
  relatedResourceId?: string
}

export type RelatedResourceType =
  'invoice' | 'payment' | 'quote' | 'credit-note'

export type RelatedResourceSnapshot = {
  number?: string
  amount?: string
  currency?: string
  status?: string
}

export type SourceApp =
  '876-invoice' | '876-billing' | '876-crm' | '876-console'

/** Request-form provenance persisted with a request; not part of the public CRM SDK contract. */
export interface RequestIntakeContext {
  formId: string
  formVersion: number
  definitionSnapshot: unknown
  answers: Record<string, unknown>
  customerOrganizationId?: string | null
  customerUserId?: string | null
}

/** Internal deletion audit input used by the CRM service layer. */
export interface DeleteRequestInput {
  deletedBy: string
  reason?: string | null
}
