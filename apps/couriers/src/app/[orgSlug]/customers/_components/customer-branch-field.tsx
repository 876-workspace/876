'use client'

import { Suspense, use, useLayoutEffect } from 'react'
import { FormRow } from '@876/ui/form-row'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'

export type CustomerBranchOption = {
  id: string
  name: string
}

type Props = {
  branches: CustomerBranchOption[] | Promise<CustomerBranchOption[]>
  value: string
  onValueChange: (value: string) => void
  onBranchesReady: () => void
  disabled: boolean
  className?: string
}

/** Streams the branch selector without delaying the rest of the customer form. */
export function CustomerBranchField({ branches, ...props }: Props) {
  if (Array.isArray(branches))
    return <ResolvedCustomerBranchField branches={branches} {...props} />

  return (
    <Suspense
      fallback={<CustomerBranchFieldSkeleton className={props.className} />}
    >
      <StreamingCustomerBranchField branches={branches} {...props} />
    </Suspense>
  )
}

function StreamingCustomerBranchField({
  branches: branchesPromise,
  ...props
}: Omit<Props, 'branches'> & { branches: Promise<CustomerBranchOption[]> }) {
  const branches = use(branchesPromise)

  return <ResolvedCustomerBranchField branches={branches} {...props} />
}

function ResolvedCustomerBranchField({
  branches,
  value,
  onValueChange,
  onBranchesReady,
  disabled,
  className,
}: Omit<Props, 'branches'> & { branches: CustomerBranchOption[] }) {
  useLayoutEffect(() => {
    if (!value && branches.length === 1) onValueChange(branches[0]!.id)
    onBranchesReady()
  }, [branches, onBranchesReady, onValueChange, value])

  return (
    <FormRow
      htmlFor="customer-branch"
      label="Branch"
      required
      className={className}
    >
      <Select
        value={value}
        onValueChange={(next) => onValueChange(next ?? '')}
        disabled={disabled || branches.length === 0}
        items={branches.map((branch) => ({
          value: branch.id,
          label: branch.name,
        }))}
        required
      >
        <SelectTrigger id="customer-branch" className="w-80">
          <SelectValue placeholder="Select branch" />
        </SelectTrigger>
        <SelectContent>
          {branches.map((branch) => (
            <SelectItem key={branch.id} value={branch.id}>
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormRow>
  )
}

function CustomerBranchFieldSkeleton({ className }: Pick<Props, 'className'>) {
  return (
    <FormRow label="Branch" required className={className}>
      <div
        aria-label="Loading branches"
        className="bg-muted h-9 w-80 animate-pulse rounded-md"
      />
    </FormRow>
  )
}
