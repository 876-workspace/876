import { cn } from '@876/core/utils'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'

import { statusBadgeClass } from '@/lib/format'

export function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
  inputMode,
  disabled = false,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </div>
  )
}

export function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
        statusBadgeClass(status)
      )}
    >
      {status}
    </span>
  )
}
