'use client'

import * as React from 'react'

import { Loader2Icon } from '../icons'
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
  /** Right-aligned trailing value, e.g. a price. Rendered tabular. */
  meta?: string
  /**
   * Renders the row as a quiet "escape hatch" rather than a record — used for
   * a free-text choice such as a one-off invoice line.
   */
  isAction?: boolean
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
  /**
   * Shown while the query is below `minChars`. Lets a control offer a useful
   * starting set -- a catalogue picker wants a first page, a customer picker
   * over thousands of records deliberately does not.
   */
  initialOptions?: readonly AsyncComboboxOption[]
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
  initialOptions,
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

    // An empty box never asks the server for anything: either the host gave a
    // starting set to show, or the control stays empty until the user narrows
    // it. Beyond that, `minChars` decides how much narrowing is enough.
    if (trimmed.length === 0 || trimmed.length < minChars) {
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
    (minChars > 1
      ? `Type ${minChars} or more characters to search.`
      : 'Start typing to search.')

  const trimmedQuery = query.trim()
  const belowThreshold =
    trimmedQuery.length === 0 || trimmedQuery.length < minChars

  // Before the threshold the control shows whatever starting set the host
  // supplied, so a catalogue picker is useful on focus while a picker over
  // thousands of records stays empty until the user narrows it.
  const visible = belowThreshold ? (initialOptions ?? []) : options

  const message = error
    ? error
    : loading
      ? 'Searching…'
      : belowThreshold
        ? prompt
        : emptyMessage

  return (
    <Combobox
      items={visible}
      // Results are already filtered by the server; filtering them again on
      // the client would hide rows that legitimately matched.
      filter={null}
      value={value === '' ? null : value}
      inputValue={query === '' && value !== '' ? selectedLabel : query}
      // Base UI writes the chosen item into the box. Our items are plain
      // string values, so without a label it wrote the id; and a written query
      // would also kick off a pointless search for the chosen record. On a
      // selection, clear the query so the box shows the host's selectedLabel.
      itemToStringLabel={(item: string) =>
        visible.find((option) => option.value === item)?.label ??
        (item === value ? selectedLabel : '')
      }
      onInputValueChange={(next, details) =>
        setQuery(details.reason === 'item-press' ? '' : next)
      }
      onValueChange={(next) => {
        setQuery('')
        const selected = typeof next === 'string' ? next : ''
        onValueChange(
          selected,
          visible.find((option) => option.value === selected) ?? null
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
        <ComboboxEmpty>
          <span
            className={cn(
              'flex items-center gap-2 px-2 py-3 text-sm',
              error ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {loading ? (
              <Loader2Icon
                className="size-3.5 shrink-0 animate-spin"
                aria-hidden
              />
            ) : null}
            {message}
          </span>
        </ComboboxEmpty>
        <ComboboxList>
          {(option: AsyncComboboxOption) => (
            <ComboboxItem key={option.value} value={option.value}>
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span
                    className={cn(
                      'truncate',
                      option.isAction
                        ? 'text-muted-foreground italic'
                        : 'font-medium'
                    )}
                  >
                    {option.label}
                  </span>
                  {option.description ? (
                    <span className="text-muted-foreground truncate text-xs">
                      {option.description}
                    </span>
                  ) : null}
                </span>
                {option.meta ? (
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {option.meta}
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
