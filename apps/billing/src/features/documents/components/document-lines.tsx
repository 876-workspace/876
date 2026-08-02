import { formatMoney } from '@/lib/format'

interface DocumentLine {
  id: string
  description: string
  quantity: number
  unitAmount: bigint
  taxAmount: bigint
  totalAmount: bigint
}

export function DocumentLines({
  lines,
  currency,
}: {
  lines: DocumentLine[]
  currency: string
}) {
  return (
    <section className="876-card overflow-hidden">
      <div className="border-border border-b px-5 py-4">
        <h2 className="font-medium">Line items</h2>
      </div>
      <div className="divide-border divide-y">
        {lines.map((line) => (
          <div
            key={line.id}
            className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-[1fr_auto_auto] sm:items-center"
          >
            <div>
              <p className="font-medium">{line.description}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {formatMoney(line.unitAmount, currency)} each
                {line.taxAmount > 0n
                  ? ` · ${formatMoney(line.taxAmount, currency)} tax`
                  : ''}
              </p>
            </div>
            <span className="text-muted-foreground">Qty {line.quantity}</span>
            <span className="font-medium">
              {formatMoney(line.totalAmount, currency)}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
