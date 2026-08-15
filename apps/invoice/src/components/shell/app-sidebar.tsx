import Link from 'next/link'

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/invoices', label: 'Invoices' },
  { href: '/customers', label: 'Customers' },
  { href: '/settings', label: 'Settings' },
]

export function AppSidebar() {
  return (
    <aside className="bg-muted/20 w-60 shrink-0 border-r p-4">
      <div className="mb-6 font-semibold tracking-tight">876 Invoice</div>
      <nav className="flex flex-col gap-1">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="hover:bg-accent hover:text-accent-foreground rounded-md px-3 py-2 text-sm"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
