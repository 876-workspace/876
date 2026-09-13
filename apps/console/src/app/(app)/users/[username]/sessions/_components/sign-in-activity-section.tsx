import Link from 'next/link'
import { Badge } from '@876/ui/badge'
import { KeyRound } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

export type AttemptRow = {
  id: string
  event: string
  outcome: string
  failureCode: string | null
  location: string | null
  device: string | null
  ipAddress: string | null
  createdAt: number
}

type Props = { attempts: AttemptRow[] }

function outcomeVariant(outcome: string) {
  if (outcome === 'succeeded') return 'success' as const
  if (outcome === 'failed') return 'destructive' as const
  return 'secondary' as const
}

export function SignInActivitySection({ attempts }: Props) {
  return (
    <div className="876-card p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-[0.8125rem] font-semibold">
          <KeyRound className="text-muted-foreground size-4" />
          Sign-in activity
        </h2>
        <Link
          className="text-muted-foreground text-xs hover:underline"
          href="/security/sign-ins"
        >
          View all
        </Link>
      </div>

      {attempts.length === 0 ? (
        <p className="text-muted-foreground text-[0.8125rem]">
          No sign-in activity recorded.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attempts.map((attempt) => (
                <TableRow key={attempt.id}>
                  <TableCell className="font-medium">
                    {attempt.event.replace(/_/g, ' ')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={outcomeVariant(attempt.outcome)}>
                      {attempt.outcome}
                    </Badge>
                    {attempt.failureCode && (
                      <div className="text-muted-foreground mt-1 text-xs">
                        {attempt.failureCode}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {attempt.location ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {attempt.device ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {attempt.ipAddress ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(attempt.createdAt * 1000).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
