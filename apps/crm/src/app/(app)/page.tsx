import Link from 'next/link'

import { Page } from '@876/ui/page'

const SECTIONS = [
  {
    href: '/customers',
    title: 'Customers',
    description: 'View the shared customer relationships available to this CRM workspace.',
  },
  {
    href: '/tickets',
    title: 'Tickets',
    description: 'Track support and relationship issues with simple statuses and notes.',
  },
]

export default function DashboardPage() {
  return (
    <Page>
      <div className="mb-6">
        <h1 className="876-page-title">CRM</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Customers and tickets in one small workspace.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map((section) => (
          <Link key={section.href} href={section.href} className="rounded-xl border p-5 transition-colors hover:bg-muted/40">
            <h2 className="font-semibold">{section.title}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{section.description}</p>
          </Link>
        ))}
      </div>
    </Page>
  )
}
