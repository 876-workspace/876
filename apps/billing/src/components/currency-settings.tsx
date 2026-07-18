'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@876/ui/dialog'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { Pencil, Trash, Plus } from '@876/ui/icons'
import type { ColumnDef } from '@tanstack/react-table'

import { client } from '@/lib/client'
import { ResourceToolbar } from '@/components/resource-toolbar'

type CurrencyOption = {
  code: string
  name: string
  symbol: string | null
  decimalPlaces?: number
}

type EnabledCurrency = CurrencyOption & { isDefault: boolean }

export function CurrencySettings({
  enabled,
  canManage,
}: {
  enabled: EnabledCurrency[]
  canManage: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCurrency, setEditingCurrency] =
    useState<EnabledCurrency | null>(null)

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [decimalPlaces, setDecimalPlaces] = useState(2)

  function openNewModal() {
    setCode('')
    setName('')
    setSymbol('')
    setDecimalPlaces(2)
    setEditingCurrency(null)
    setError(null)
    setIsModalOpen(true)
  }

  function openEditModal(currency: EnabledCurrency) {
    setCode(currency.code)
    setName(currency.name)
    setSymbol(currency.symbol ?? '')
    setDecimalPlaces(currency.decimalPlaces ?? 2)
    setEditingCurrency(currency)
    setError(null)
    setIsModalOpen(true)
  }

  async function handleSave() {
    setError(null)
    startTransition(async () => {
      let result
      if (editingCurrency) {
        result = await client.currencies.update(editingCurrency.code, {
          name,
          symbol: symbol || null,
          decimalPlaces,
        })
      } else {
        result = await client.currencies.create({
          code,
          name,
          symbol: symbol || null,
          decimalPlaces,
        })
      }

      if (result.error) {
        setError(result.error.message)
        return
      }

      setIsModalOpen(false)
      router.refresh()
    })
  }

  async function handleDelete(code: string) {
    if (!confirm('Are you sure you want to delete this currency?')) return
    startTransition(async () => {
      const result = await client.currencies.remove(code)
      if (result.error) {
        alert(result.error)
      }
      router.refresh()
    })
  }

  async function handleSetDefault(code: string) {
    startTransition(async () => {
      const result = await client.currencies.setDefault({ currency: code })
      if (result.error) {
        alert(result.error)
      }
      router.refresh()
    })
  }

  const sortedEnabled = useMemo(() => {
    return [...enabled].sort((a, b) => a.code.localeCompare(b.code))
  }, [enabled])

  const columns = useMemo<ColumnDef<EnabledCurrency>[]>(
    () => [
      {
        header: 'Currency',
        accessorKey: 'name',
        cell: ({ row }) => {
          const { code, name, isDefault } = row.original
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {code} - {name}
              </span>
              {isDefault && (
                <Badge variant="success" className="ml-2">
                  Base Currency
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        header: 'Symbol',
        accessorKey: 'symbol',
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.symbol || '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const currency = row.original
          if (!canManage) return null

          return (
            <div className="flex translate-x-2 justify-end opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 focus-within:opacity-100">
              <div className="border-border bg-background/95 flex items-center gap-0.5 rounded-lg border p-1 shadow-sm backdrop-blur">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground size-7 rounded-md"
                  onClick={() => openEditModal(currency)}
                  title="Edit currency"
                >
                  <Pencil className="size-3.5" />
                  <span className="sr-only">Edit</span>
                </Button>
                {!currency.isDefault && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 size-7 rounded-md"
                    onClick={() => handleDelete(currency.code)}
                    title="Delete currency"
                  >
                    <Trash className="size-3.5" />
                    <span className="sr-only">Delete</span>
                  </Button>
                )}
              </div>
            </div>
          )
        },
      },
    ],
    [canManage]
  )

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="876-page-title">Currencies</h2>
        {canManage && (
          <Button onClick={openNewModal} variant="info">
            <Plus className="size-3.5" />
            Add
          </Button>
        )}
      </div>

      <div className="876-card overflow-hidden">
        <DataTable
          columns={columns}
          data={sortedEnabled}
          className="border-0"
          rowClassName="group"
        />
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCurrency ? 'Edit Currency' : 'New Currency'}
            </DialogTitle>
            <DialogDescription>
              {editingCurrency
                ? 'Update currency details.'
                : 'Add a new currency to your workspace.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Currency Code</Label>
              <Input
                id="code"
                placeholder="USD"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={!!editingCurrency}
                maxLength={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="US Dollar"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="symbol">Symbol</Label>
              <Input
                id="symbol"
                placeholder="$"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="decimalPlaces">Decimal Places</Label>
              <Input
                id="decimalPlaces"
                type="number"
                min="0"
                max="4"
                value={decimalPlaces}
                onChange={(e) =>
                  setDecimalPlaces(parseInt(e.target.value) || 0)
                }
              />
            </div>
            {error && (
              <p className="text-destructive text-sm font-medium">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending || !code || !name}>
              {isPending ? 'Saving...' : 'Save Currency'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
