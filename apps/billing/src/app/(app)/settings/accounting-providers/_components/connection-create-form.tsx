'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { client } from '@/lib/client'

type ProviderOption = {
  value: string
  label: string
}

export function ConnectionCreateForm({
  providers,
}: {
  providers: ProviderOption[]
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <form
      className="876-card grid gap-5 p-5 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault()
        const form = event.currentTarget
        const data = new FormData(form)
        setError(null)
        startTransition(async () => {
          const result = await client.accountingProviders.connections.create({
            providerId: String(data.get('providerId') ?? ''),
            name: String(data.get('name') ?? ''),
            environment: 'live',
            mode: 'mirror',
          })
          if (result.error) {
            setError(result.error.message)
            return
          }
          router.push('/settings/accounting-providers')
          router.refresh()
        })
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="accounting-provider-id">Provider</Label>
        <NativeSelect
          id="accounting-provider-id"
          name="providerId"
          className="w-full"
          required
        >
          <NativeSelectOption value="">Select provider…</NativeSelectOption>
          {providers.map((provider) => (
            <NativeSelectOption key={provider.value} value={provider.value}>
              {provider.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <div className="space-y-2">
        <Label htmlFor="accounting-provider-name">Connection name</Label>
        <Input
          id="accounting-provider-name"
          name="name"
          placeholder="Primary Zoho Books"
          required
          maxLength={120}
        />
      </div>

      <div className="sm:col-span-2">
        <p className="text-muted-foreground text-sm">
          New connections start in mirror mode. 876 Billing remains the source
          of truth and projects supported records to the connected accounting
          system after authorization.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm sm:col-span-2">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" disabled={isPending || providers.length === 0}>
          {isPending ? 'Creating…' : 'Create connection'}
        </Button>
      </div>
    </form>
  )
}
