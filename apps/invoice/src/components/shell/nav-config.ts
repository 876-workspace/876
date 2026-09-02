// The registry lives in @876/billing so Console can render the same navigation
// for an organization's workspace without copying it. Invoice is a view onto
// the same finance plane, so its registry sits beside Billing's.
export { invoiceNavigation as navConfig } from '@876/billing/navigation'
