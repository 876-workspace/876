import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import { Badge } from '@876/ui/badge'
import { $876 } from '@/lib/876'

export const metadata = { title: 'Sign-ins' }
export default async function SignInsPage() {
  const result = await $876.authAttempts.list({ limit: 50 })
  if (result.error) throw new Error(result.error.message)
  return (
    <Page>
      <ResourceToolbar title="Sign-ins" refresh />
      <div className="876-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Identifier</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  {row.identifier ?? row.user_id ?? 'Anonymous'}
                </TableCell>
                <TableCell>{row.event}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      row.outcome === 'failed' || row.outcome === 'blocked'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {row.outcome}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {[row.ip_city, row.ip_country_code]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {[row.device_model, row.os_name, row.browser_name]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {row.ip_address ?? '—'}
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {new Date(row.created_at * 1000).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Page>
  )
}
