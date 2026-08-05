import Link from 'next/link'
import { Badge } from '@876/ui/badge'
import { Monitor } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

export type DeviceRow = {
  id: string
  name: string
  detail: string | null
  lastLocation: string | null
  signInCount: number
  lastSeenAt: number
  trusted: boolean
  blocked: boolean
}

type Props = { devices: DeviceRow[] }

function formatWhen(seconds: number) {
  return new Date(seconds * 1000).toLocaleString()
}

export function DevicesSection({ devices }: Props) {
  return (
    <div className="876-card p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <Monitor className="text-muted-foreground size-4" />
        Devices
      </h2>

      {devices.length === 0 ? (
        <p className="text-muted-foreground text-sm">No devices recorded.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Last location</TableHead>
                <TableHead>Sign-ins</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>
                    <Link
                      className="font-medium hover:underline"
                      href={`/security/devices/${device.id}`}
                    >
                      {device.name}
                    </Link>
                    {device.detail && (
                      <div className="text-muted-foreground text-xs">
                        {device.detail}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {device.lastLocation ?? '—'}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {device.signInCount}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatWhen(device.lastSeenAt)}
                  </TableCell>
                  <TableCell>
                    {device.blocked ? (
                      <Badge variant="destructive">Blocked</Badge>
                    ) : device.trusted ? (
                      <Badge variant="success">Trusted</Badge>
                    ) : (
                      <Badge variant="secondary">Unrecognized</Badge>
                    )}
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
