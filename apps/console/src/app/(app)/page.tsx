import { Activity, Flag, ShieldCheck, Users } from '@876/ui/icons'
import type { ComponentType } from 'react'
import { Page } from '@876/ui/page'

export const metadata = { title: 'Dashboard' }

export default function DashboardPage() {
  return (
    <Page>
      <h1 className="876-page-title mb-5">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total users" value="-" icon={Users} />
        <StatCard title="Active sessions" value="-" icon={Activity} />
        <StatCard title="Feature flags" value="-" icon={Flag} />
        <StatCard title="Console users" value="-" icon={ShieldCheck} />
      </div>
    </Page>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: string
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <div className="876-card p-6">
      <div className="text-muted-foreground flex items-center justify-between text-sm font-medium">
        {title}
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}
