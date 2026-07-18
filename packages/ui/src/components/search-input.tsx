'use client'

import { SearchIcon } from '../icons'
import { Button } from './button'
import { Input } from './input'

type Props = {
  value: string
  onChange: (value: string) => void
  onSearch: () => void
  placeholder?: string
  isPending?: boolean
}

export function SearchInput({
  value,
  onChange,
  onSearch,
  placeholder = 'Search…',
  isPending = false,
}: Props) {
  return (
    <div className="flex gap-2">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSearch()
        }}
        className="flex-1"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={onSearch}
        disabled={isPending || value.trim().length < 2}
      >
        <SearchIcon className="size-3.5" />
        {isPending ? 'Searching…' : 'Search'}
      </Button>
    </div>
  )
}
