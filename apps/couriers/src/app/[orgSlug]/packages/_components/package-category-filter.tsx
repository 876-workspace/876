'use client'

import { Suspense, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'

import type { PackageFormOption } from '../_lib/package-form-data'

export function PackageCategoryFilter({
  categoryOptions,
}: {
  categoryOptions: Promise<PackageFormOption[]>
}) {
  return (
    <Suspense fallback={<CategorySelect disabled />}>
      <PackageCategoryFilterOptions categoryOptions={categoryOptions} />
    </Suspense>
  )
}

function PackageCategoryFilterOptions({
  categoryOptions,
}: {
  categoryOptions: Promise<PackageFormOption[]>
}) {
  const categories = use(categoryOptions)
  const router = useRouter()
  const searchParams = useSearchParams()
  const category = searchParams.get('category') ?? 'all'

  function changeCategory(value: string | null) {
    const next = new URLSearchParams(searchParams)
    next.delete('after')
    next.delete('before')
    if (!value || value === 'all') next.delete('category')
    else next.set('category', value)
    const query = next.toString()
    router.push(query ? `?${query}` : '?')
  }

  return (
    <CategorySelect
      categories={categories}
      category={category}
      onValueChange={changeCategory}
    />
  )
}

function CategorySelect({
  categories = [],
  category = 'all',
  disabled = false,
  onValueChange,
}: {
  categories?: PackageFormOption[]
  category?: string
  disabled?: boolean
  onValueChange?: (value: string | null) => void
}) {
  return (
    <Select
      value={disabled ? null : category}
      disabled={disabled}
      onValueChange={onValueChange}
    >
      <SelectTrigger aria-label="Category" className="h-8 w-44 text-xs">
        <SelectValue placeholder="All categories" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All categories</SelectItem>
        {categories.map((categoryOption) => (
          <SelectItem key={categoryOption.value} value={categoryOption.value}>
            {categoryOption.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
