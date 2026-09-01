/**
 * `@876/crm` owns the CRM request contracts. Console keeps its historical
 * `Crm`-prefixed alias so existing call sites stay stable, but the union itself
 * is never restated here.
 */
export type { RequestStatus as CrmRequestStatus } from '@876/crm'
