import Link from 'next/link'

import { Page } from '@876/ui/page'

const SECTIONS = [
  {
    href: '/customers',
    title: 'Customers',
    description:
      'View the shared customer relationships available to this CRM workspace.',
  },
  {
    href: '/requests',
    title: 'Requests',
    description:
      'Track customer requests with simple statuses, categories, assignees, and notes.',
  },
]

export default function DashboardPage() {
  return (
    <Page>
      <div className="mb-6">
        <h1 className="876-page-title">CRM</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Customers and requests in one small workspace.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="hover:bg-muted/40 rounded-xl border p-5 transition-colors"
          >
            <h2 className="font-semibold">{section.title}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {section.description}
            </p>
          </Link>
        ))}
      </div>
    </Page>
  )
}
