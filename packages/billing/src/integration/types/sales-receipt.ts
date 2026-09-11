import type {
  SalesReceipt,
  SalesReceiptCreateParams,
  SalesReceiptListParams,
  SalesReceiptQuoteConversionParams,
  SalesReceiptRefundParams,
  SalesReceiptVoidParams,
} from '../../types/sales-receipt'
import type { List } from './common'

export type BillingSalesReceipt = SalesReceipt
export type BillingSalesReceiptList = List<BillingSalesReceipt>
export type BillingSalesReceiptListParams = SalesReceiptListParams
export type BillingSalesReceiptRefundParams = SalesReceiptRefundParams
export type BillingSalesReceiptVoidParams = SalesReceiptVoidParams
export type BillingSalesReceiptQuoteConversionParams =
  SalesReceiptQuoteConversionParams

export type BillingSalesReceiptCreateParams = SalesReceiptCreateParams & {
  sourceExternalReference?: string | null
}
