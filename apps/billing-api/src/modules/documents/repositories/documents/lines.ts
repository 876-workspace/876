import { buildCommercialLines } from '@/modules/commercial-lines'
import type { DocumentLineCreateParams } from '../../schemas/document-line'

/**
 * Document-facing adapter around the shared commercial line resolver. Keep the
 * document input type local while Catalog/Pricing/calculation behavior remains
 * owned by the neutral commercial-line module.
 */
export function buildDocumentLines(
  tenantId: string,
  currency: string,
  params: DocumentLineCreateParams[],
  priceListId?: string | null
) {
  return buildCommercialLines(tenantId, currency, params, priceListId)
}
