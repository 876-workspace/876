'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { DataTable } from '@876/ui/data-table'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { formatMoney } from '@/lib/format'

type CouponRow = {
  id: string
  name: string
  duration: 'ONCE' | 'REPEATING' | 'FOREVER'
  durationInCycles: number | null
  percentOff: { toString(): string } | null
  amountOff: bigint | null
  currency: string | null
  isActive: boolean
  timesRedeemed: number
  product: { name: string } | null
  promotionCodes: { id: string; code: string; isActive: boolean }[]
}

import { DataTableColumnHeader } from '@876/ui/data-table-column-header'

export function CouponsTable({ coupons }: { coupons: CouponRow[] }) {
  const router = useRouter()
  const columns: ColumnDef<CouponRow, unknown>[] = [
    {
      id: 'coupon',
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Coupon" />
      ),
      cell: ({ row }) => (
        <>
          <Link
            href={`/coupons/${row.original.id}`}
            className="font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.name}
          </Link>
          <p className="text-muted-foreground mt-0.5 font-mono text-xs">
            {row.original.promotionCodes
              .filter((code) => code.isActive)
              .map((code) => code.code)
              .join(', ') || 'No active code'}
          </p>
        </>
      ),
    },
    {
      id: 'product',
      enableSorting: false,
      header: 'Product',
      cell: ({ row }) => row.original.product?.name ?? 'All products',
    },
    {
      id: 'discount',
      enableSorting: false,
      header: 'Discount',
      cell: ({ row }) => formatDiscount(row.original),
    },
    {
      id: 'duration',
      accessorKey: 'duration',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Duration" />
      ),
      cell: ({ row }) =>
        row.original.duration === 'REPEATING'
          ? `${row.original.durationInCycles ?? 0} cycles`
          : row.original.duration.toLowerCase(),
    },
    {
      id: 'redemptions',
      accessorKey: 'timesRedeemed',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Redemptions" />
      ),
      cell: ({ row }) => row.original.timesRedeemed,
    },
    {
      id: 'status',
      accessorKey: 'isActive',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (row.original.isActive ? 'Active' : 'Archived'),
    },
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={coupons}
        onRowClick={(coupon) => router.push(`/coupons/${coupon.id}`)}
      />
    </div>
  )
}

function formatDiscount(coupon: CouponRow) {
  if (coupon.percentOff !== null) return `${coupon.percentOff.toString()}%`
  if (coupon.amountOff !== null && coupon.currency)
    return formatMoney(coupon.amountOff, coupon.currency)
  return 'Multi-currency amount'
}
