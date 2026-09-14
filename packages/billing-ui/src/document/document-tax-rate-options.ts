import type { DocumentTaxRateOption } from './document-line-items-editor'

interface TaxRateRecord {
  id: string
  name: string
  rate: string
  inclusive: boolean
  isActive: boolean
}

/** `"15.0000"` → `"15"`, `"16.5000"` → `"16.5"`, without a float round trip. */
function trimRate(rate: string) {
  return rate.includes('.') ? rate.replace(/\.?0+$/, '') : rate
}

/**
 * The organization's tax rates a document line may be charged at.
 *
 * Inclusive rates are left out: the document pipeline adds line tax on top of
 * the line amount, so an inclusive rate would be counted twice.
 */
export function toDocumentTaxRateOptions(
  rates: readonly TaxRateRecord[]
): DocumentTaxRateOption[] {
  return rates
    .filter((rate) => rate.isActive && !rate.inclusive)
    .map((rate) => ({
      id: rate.id,
      label: `${rate.name} [${trimRate(String(rate.rate))}%]`,
      rate: String(rate.rate),
    }))
}
