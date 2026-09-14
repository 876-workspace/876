const FINANCE_SECTIONS = [
  { id: 'taxes', label: 'Taxes' },
  { id: 'currencies', label: 'Currencies' },
  { id: 'payment-modes', label: 'Payment modes' },
] as const

/** Sticky in-page index — one click to any finance section. */
export function FinanceSectionNav() {
  return (
    <nav
      aria-label="Finance sections"
      className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-10 mb-8 border-b py-2 backdrop-blur"
    >
      <ul className="flex gap-1 overflow-x-auto">
        {FINANCE_SECTIONS.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors"
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
