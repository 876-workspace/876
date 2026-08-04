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

/**
 * The {@link SearchInput} shape, inert, for a `loading.tsx` or a Suspense
 * fallback.
 *
 * A loading fallback that renders a *live* search box is worse than one that
 * renders none: the input accepts text, has nothing wired to it, and is
 * unmounted the moment the real UI streams in, so whatever was typed vanishes
 * without explanation. Rendering the same box disabled keeps the row's height
 * and position stable — no jump when the real control replaces it — while
 * making it obvious the control is not ready yet.
 *
 * Takes no callbacks, so it can be rendered directly from a Server Component
 * (`loading.tsx` included), where the function props of `SearchInput` could not
 * cross the boundary.
 */
export function SearchInputPlaceholder({
  placeholder = 'Search…',
}: {
  placeholder?: string
}) {
  return (
    <div className="flex gap-2" aria-busy="true">
      <Input
        placeholder={placeholder}
        readOnly
        disabled
        tabIndex={-1}
        aria-hidden="true"
        className="flex-1"
      />
      <Button variant="outline" size="sm" disabled tabIndex={-1} aria-hidden>
        <SearchIcon className="size-3.5" />
        Search
      </Button>
    </div>
  )
}
