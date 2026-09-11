import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@876/ui/accordion'
import { Badge } from '@876/ui/badge'
import { ChevronDownIcon, ChevronRightIcon } from '@876/ui/icons'

import { Link } from './link'

export interface CustomerSalesReceipt {
  id: string
  number: string
  status: 'PAID' | 'VOID'
  currency: string
  totalAmount: string
  receiptAt: number
}

export interface CustomerSalesReceiptsAccordionProps {
  receipts: CustomerSalesReceipt[]
  currencyDecimals: Record<string, number>
  hrefBySalesReceiptId?: Record<string, string>
}

/** Commercial history that is intentionally absent from the customer A/R ledger. */
export function CustomerSalesReceiptsAccordion({
  receipts,
  currencyDecimals,
  hrefBySalesReceiptId = {},
}: CustomerSalesReceiptsAccordionProps) {
  return (
    <Accordion multiple={false} className="gap-3">
      <section className="border-876-surface-border overflow-hidden rounded-lg border">
        <AccordionItem value="sales-receipts" className="border-b-0">
          <AccordionTrigger className="bg-876-canvas aria-expanded:bg-876-surface aria-expanded:border-876-surface-border items-center rounded-none border-b border-transparent px-4 py-3 transition-colors hover:no-underline [&>[data-slot=accordion-trigger-icon]]:hidden">
            <span className="flex items-center gap-3">
              <ChevronRightIcon className="text-muted-foreground size-4 group-aria-expanded/accordion-trigger:hidden" />
              <ChevronDownIcon className="text-muted-foreground hidden size-4 group-aria-expanded/accordion-trigger:inline" />
              <span className="text-sm font-semibold">Sales receipts</span>
              {receipts.length > 0 ? (
                <span className="text-muted-foreground text-xs font-normal">
                  {receipts.length}
                </span>
              ) : null}
            </span>
          </AccordionTrigger>
          <AccordionContent className="bg-876-surface p-0">
            {receipts.length === 0 ? (
              <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                No sales receipts found.
              </p>
            ) : (
              <div className="876-scroll overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="text-muted-foreground border-b text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium">Sales receipt</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((receipt) => {
                      const href = hrefBySalesReceiptId[receipt.id]
                      return (
                        <tr key={receipt.id} className="border-b last:border-0">
                          <td className="px-4 py-3 font-medium">
                            {href ? (
                              <Link
                                href={href}
                                className="text-primary hover:underline"
                              >
                                {receipt.number}
                              </Link>
                            ) : (
                              receipt.number
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {formatDate(receipt.receiptAt)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary">
                              {receipt.status === 'VOID' ? 'Void' : 'Paid'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-medium tabular-nums">
                            {formatMinorAmount(
                              receipt.totalAmount,
                              receipt.currency,
                              currencyDecimals[receipt.currency] ?? 2
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </section>
    </Accordion>
  )
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-JM', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatMinorAmount(
  amount: string,
  currency: string,
  decimalPlaces: number
): string {
  const value = BigInt(amount)
  const negative = value < 0n
  const absolute = negative ? -value : value
  if (decimalPlaces === 0)
    return `${currency} ${negative ? '-' : ''}${absolute.toString()}`

  const scale = 10n ** BigInt(decimalPlaces)
  const whole = absolute / scale
  const fraction = (absolute % scale).toString().padStart(decimalPlaces, '0')
  return `${currency} ${negative ? '-' : ''}${whole}.${fraction}`
}
