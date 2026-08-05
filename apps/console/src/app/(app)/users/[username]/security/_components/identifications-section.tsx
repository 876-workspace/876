import type { AdminUserIdentification } from '@876/admin'
import { Fingerprint } from '@876/ui/icons'
import { Badge } from '@876/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

type Props = { identifications: AdminUserIdentification[] }

function formatWhen(seconds: number) {
  return new Date(seconds * 1000).toLocaleString()
}

export function IdentificationsSection({ identifications }: Props) {
  return (
    <div className="876-card p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <Fingerprint className="text-muted-foreground size-4" />
        Identifications
      </h2>

      {identifications.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No identifications recorded.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {identifications.map((identification) => (
                <TableRow key={identification.id}>
                  <TableCell className="font-medium">
                    {identification.label}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono">
                    {identification.value_masked}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {identification.country_code ?? '—'}
                  </TableCell>
                  <TableCell>
                    {identification.verified ? (
                      <Badge variant="success">Verified</Badge>
                    ) : (
                      <Badge variant="secondary">Unverified</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatWhen(identification.created_at)}
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
