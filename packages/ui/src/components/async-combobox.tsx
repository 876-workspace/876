'use client'

import * as React from 'react'

import { cn } from '../lib/utils'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from './combobox'

export type AsyncComboboxOption = {
  value: string
  label: string
  /** Optional muted second line, e.g. an email or reference. */
  description?: string
  /**
   * The host's own record for this option, handed back on selection so the
   * host does not have to re-find it in a list it no longer holds.
   */
  raw?: unknown
}

type Props = {
  /** Applied to the input so a `<Label htmlFor>` points at the control. */
  id?: string
  ariaLabel?: string
  /** The selected option's `value`, or `''` when nothing is selected. */
  value: string
  /**
   * Label for the current selection. Supplied by the host so the input can
   * display it without the component having to re-query for a value that is
   * not in the current result page.
   */
  selectedLabel?: string
  onValueChange: (value: string, option: AsyncComboboxOption | null) => void
  /**
   * Server-backed search. It receives an `AbortSignal` and **must** pass it to
   * the request, so a superseded query is cancelled on the wire rather than
   * merely ignored on arrival.
   */
  onSearch: (
    query: string,
    signal: AbortSignal
  ) => Promise<AsyncComboboxOption[]>
  /**
   * Characters required before the first request. This is what stops the
   * control from pulling an entire table on focus.
   */
  minChars?: number
  debounceMs?: number
  placeholder?: string
  /** Shown before `minChars` is reached. */
  promptMessage?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
}

/**
 * A server-backed autocomplete: the box itself is the text input, results are
 * fetched as the user types, and nothing is fetched until `minChars`.
 *
 * Use this instead of `SearchableSelect` whenever the option set lives on the
 * server and may be large. `SearchableSelect` loads its full option list up
 * front and searches it in a popup, which is right for a closed, known set (a
 * country list) and wrong for one an organization keeps adding to.
 *
 * The three failure modes this exists to avoid, per the standard typeahead
 * pattern: flooding the server on every keystroke (debounce), applying a slow
 * response for an older query over a newer one (abort), and fetching the whole
 * table when the user has typed nothing (`minChars`).
 */
export function AsyncCombobox({
  id,
  ariaLabel,
  value,
  selectedLabel = '',
  onValueChange,
  onSearch,
  minChars = 2,
  debounceMs = 250,
  placeholder = 'Search…',
  promptMessage,
  emptyMessage = 'No matches found.',
  disabled,
  className,
}: Props) {
  const [query, setQuery] = React.useState('')
  const [options, setOptions] = React.useState<AsyncComboboxOption[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const abortRef = React.useRef<AbortController | null>(null)
  const onSearchRef = React.useRef(onSearch)
  onSearchRef.current = onSearch

  React.useEffect(() => {
    const trimmed = query.trim()

    // Below the threshold there is nothing worth asking the server for, and a
    // blank query must never turn into "send me everything".
    if (trimmed.length < minChars) {
      abortRef.current?.abort()
      abortRef.current = null
      setOptions([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const timer = setTimeout(() => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      onSearchRef
        .current(trimmed, controller.signal)
        .then((results) => {
          if (controller.signal.aborted) return
          setOptions(results)
          setLoading(false)
        })
        .catch((cause: unknown) => {
          if (controller.signal.aborted) return
          if (cause instanceof DOMException && cause.name === 'AbortError')
            return
          setError('Search is unavailable.')
          setLoading(false)
        })
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, minChars, debounceMs])

  React.useEffect(() => () => abortRef.current?.abort(), [])

  const prompt =
    promptMessage ??
    `Type ${minChars} or more characters to search.`

  const belowThreshold = query.trim().length < minChars

  const message = error
    ? error
    : loading
      ? 'Searching…'
      : belowThreshold
        ? prompt
        : emptyMessage

  return (
    <Combobox
      items={options}
      // Results are already filtered by the server; filtering them again on
      // the client would hide rows that legitimately matched.
      filter={null}
      value={value === '' ? null : value}
      inputValue={query === '' && value !== '' ? selectedLabel : query}
      onInputValueChange={setQuery}
      onValueChange={(next) => {
        const selected = typeof next === 'string' ? next : ''
        onValueChange(
          selected,
          options.find((option) => option.value === selected) ?? null
        )
      }}
      disabled={disabled}
    >
      <ComboboxInput
        id={id}
        aria-label={ariaLabel}
        placeholder={placeholder}
        showClear
        disabled={disabled}
        className={cn('w-full', className)}
      />

      <ComboboxContent>
        <ComboboxEmpty>{message}</ComboboxEmpty>
        <ComboboxList>
          {(option: AsyncComboboxOption) => (
            <ComboboxItem key={option.value} value={option.value}>
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{option.label}</span>
                {option.description ? (
                  <span className="text-muted-foreground truncate text-xs">
                    {option.description}
                  </span>
                ) : null}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
