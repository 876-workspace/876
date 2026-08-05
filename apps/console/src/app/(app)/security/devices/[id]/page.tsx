import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Badge } from '@876/ui/badge'
import { Page, PageBreadcrumb } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import { $876 } from '@/lib/876'
import { DeviceActions } from './_components/device-actions'

type Props = { params: Promise<{ id: string }> }

export const metadata = { title: 'Device' }

function formatWhen(seconds: number | null) {
  if (seconds === null) return '—'
  return new Date(seconds * 1000).toLocaleString()
}

export default async function DevicePage({ params }: Props) {
  const { id } = await params
  const result = await $876.devices.retrieve(id)
  if (result.error) notFound()

  const device = result.data
  const name =
    device.label ??
    [device.device_brand, device.device_model].filter(Boolean).join(' ') ??
    device.device_type

  return (
    <Page>
      <PageBreadcrumb href="/security" label="Security" className="mb-4" />

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="876-page-title">{name || device.device_type}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {[device.os_name, device.browser_name].filter(Boolean).join(' · ') ||
              'Unknown platform'}
          </p>
        </div>
        <DeviceActions
          deviceId={device.id}
          trusted={device.trusted}
          blocked={device.blocked_at !== null}
        />
      </div>

      <div className="876-card mb-6 p-5">
        <h2 className="mb-4 text-sm font-semibold">Signal</h2>
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <Field label="Fingerprint" value={device.fingerprint} mono />
          <Field label="Confidence" value={device.confidence} />
          <Field label="Type" value={device.device_type} />
          <Field label="Bot" value={device.is_bot ? 'Yes' : 'No'} />
          <Field label="First seen" value={formatWhen(device.first_seen_at)} />
          <Field label="Last seen" value={formatWhen(device.last_seen_at)} />
          <Field label="Last IP" value={device.last_ip ?? '—'} mono />
          <Field
            label="Last country"
            value={device.last_country_code ?? '—'}
          />
          <Field label="Sign-ins" value={String(device.sign_in_count)} />
          <Field
            label="Status"
            value={
              device.blocked_at !== null
                ? `Blocked${device.block_reason ? ` — ${device.block_reason}` : ''}`
                : device.trusted
                  ? 'Trusted'
                  : 'Unrecognized'
            }
          />
        </dl>
      </div>

      <Suspense fallback={<Skeleton className="mb-6 h-40 w-full" />}>
        <AccountsOnDevice deviceId={device.id} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <RecentAttempts deviceId={device.id} />
      </Suspense>
    </Page>
  )
}

function Field({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={`text-sm ${mono ? 'font-mono break-all' : ''}`}>
        {value}
      </dd>
    </div>
  )
}

/**
 * Every account seen on this fingerprint. This is the one view that cannot live
 * under a single user — it spans accounts, and more than two rows here is the
 * strongest shared-device signal Console has.
 */
async function AccountsOnDevice({ deviceId }: { deviceId: string }) {
  const result = await $876.devices.listUsers(deviceId)
  const rows = result.error ? [] : result.data.data

  return (
    <div className="876-card mb-6 p-5">
      <h2 className="mb-4 text-sm font-semibold">Accounts on this device</h2>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">No accounts recorded.</p>
      ) : (
        <>
          {rows.length > 2 && (
            <Badge variant="warning" className="mb-3">
              {rows.length} accounts share this device
            </Badge>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>First seen</TableHead>
                  <TableHead>Last seen</TableHead>
                  <TableHead>Sign-ins</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.user_id}>
                    <TableCell className="font-medium">
                      <Link
                        className="hover:underline"
                        href={`/users/${row.user_id}`}
                      >
                        {row.user_id}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatWhen(row.first_seen_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatWhen(row.last_seen_at)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {row.sign_in_count}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}

async function RecentAttempts({ deviceId }: { deviceId: string }) {
  const result = await $876.devices.listAttempts(deviceId, { limit: 20 })
  const rows = result.error ? [] : result.data.data

  return (
    <div className="876-card p-5">
      <h2 className="mb-4 text-sm font-semibold">Recent attempts</h2>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">No attempts recorded.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((attempt) => (
                <TableRow key={attempt.id}>
                  <TableCell className="font-medium">
                    {attempt.event.replace(/_/g, ' ')}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        attempt.outcome === 'succeeded'
                          ? 'success'
                          : attempt.outcome === 'failed'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {attempt.outcome}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {attempt.ip_address ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatWhen(attempt.created_at)}
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
