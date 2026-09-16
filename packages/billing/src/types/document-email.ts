export type DocumentEmailResourceType = 'invoice' | 'quote'

export type DocumentEmailRecipient = {
  email: string
  name?: string
}

export type DocumentEmailSender = {
  id: string
  name: string
  email: string
  replyTo: string | null
}

export type DocumentEmailPrepareParams = {
  senderId?: string
  templateId?: string
}

export type DocumentEmailSendParams = {
  senderId: string
  templateId?: string | null
  to: DocumentEmailRecipient[]
  cc?: DocumentEmailRecipient[]
  bcc?: DocumentEmailRecipient[]
  subject: string
  html: string
  text?: string | null
}

export type DocumentEmailSendOptions = {
  idempotencyKey: string
  signal?: AbortSignal
}

export type DocumentEmailComposition = {
  object: 'document_email_composition'
  resourceType: DocumentEmailResourceType
  resourceId: string
  sender: DocumentEmailSender
  to: DocumentEmailRecipient[]
  cc: DocumentEmailRecipient[]
  bcc: DocumentEmailRecipient[]
  templateId: string | null
  subject: string
  html: string
  text: string | null
}

export type DocumentEmailDelivery = {
  object: 'document_email_delivery'
  resourceType: DocumentEmailResourceType
  resourceId: string
  deliveryId: string
  providerMessageId: string | null
  status: string
  sentAt: number | null
}
