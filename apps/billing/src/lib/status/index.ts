import type { StatusVariant } from '@/types/common'

// The mapping is owned by @876/billing-ui so Billing, Invoice and Console
// cannot colour the same document status three different ways. The local alias
// is kept because Billing types other status surfaces against it.
export { documentStatusVariant } from '@876/billing-ui/document-status'
export type { StatusVariant }
