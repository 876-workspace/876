/** Shared bar chart for finance report panels. Bars are pure CSS scaled from
 * minor-unit integer strings; hosts pass pre-formatted display labels. */

export interface ReportBar {
  key: string
  /** Bucket label shown under the bar, e.g. "Sep 2026". */
  label: string
  /** Formatted value announced with the bar, e.g. "J$1,200.00". */
  valueLabel: string
  /** Minor-unit integer string used only to scale bar height. */
  rawValue: string
}

/** Converts one minor-unit amount into a bar height percentage of the max. */
export function barHeightPercent(rawValue: string, maxRaw: string): number {
  const value = BigInt(rawValue)
  const max = BigInt(maxRaw)
  if (max <= 0n || value <= 0n) return 0
  const basisPoints = Number((value * 10000n) / max) / 100
  return Math.max(basisPoints, 2)
}

function maxRawValue(bars: ReportBar[]): string {
  return bars
    .reduce((max, bar) => {
      const raw = BigInt(bar.rawValue)
      return raw > max ? raw : max
    }, 0n)
    .toString()
}

export function ReportBars({
  bars,
  ariaLabel,
  barClassName = 'bg-primary',
}: {
  bars: ReportBar[]
  ariaLabel: string
  barClassName?: string
}) {
  const maxRaw = maxRawValue(bars)
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="flex h-28 items-stretch gap-1.5"
    >
      {bars.map((bar) => (
        <div
          key={bar.key}
          className="flex min-w-0 flex-1 flex-col"
          title={`${bar.label}: ${bar.valueLabel}`}
        >
          <div className="flex min-h-0 flex-1 items-end">
            <div
              role="img"
              aria-label={`${bar.label}: ${bar.valueLabel}`}
              className={`w-full min-w-2 rounded-t ${barClassName}`}
              style={{ height: `${barHeightPercent(bar.rawValue, maxRaw)}%` }}
            />
          </div>
          <span className="text-muted-foreground mt-1 w-full truncate text-center text-[10px]">
            {bar.label}
          </span>
        </div>
      ))}
    </div>
  )
}
