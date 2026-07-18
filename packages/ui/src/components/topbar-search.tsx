'use client'

import { useEffect, useState } from 'react'

import { SearchIcon } from '../icons'
import { cn } from '../lib/utils'
import { Button } from './button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command'

export type TopbarSearchItem = {
  group: string
  title: string
  href: string
  keywords?: string[]
}

/**
 * Shared presentational topbar search palette. The consuming app provides the
 * searchable links and owns navigation through `onNavigate`; this component
 * only manages the dialog, filtering, selection, and keyboard shortcut.
 */
export function TopbarSearch({
  items,
  onNavigate,
  placeholder = 'Search...',
  className,
}: {
  items: TopbarSearchItem[]
  onNavigate: (href: string) => void
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const groups = groupItems(items)

  useEffect(() => {
    if (typeof window === 'undefined') return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== 'k' || (!event.metaKey && !event.ctrlKey))
        return

      // Ignore the shortcut when typing in page-level fields, but keep it
      // working from inside the palette itself so ⌘K also closes it.
      if (isEditableTarget(event.target) && !isPaletteTarget(event.target))
        return

      event.preventDefault()
      setOpen((currentOpen) => !currentOpen)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleSelect(href: string) {
    setOpen(false)
    onNavigate(href)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn(
          'text-muted-foreground bg-876-canvas hover:bg-muted relative hidden h-8 w-72 justify-start rounded-lg border-transparent text-sm shadow-none lg:flex',
          className
        )}
      >
        <SearchIcon aria-hidden="true" className="mr-2 size-4" />
        {placeholder}
        <kbd className="bg-876-surface pointer-events-none absolute top-1.5 right-1.5 hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Search for a page to navigate to"
      >
        <CommandInput placeholder={placeholder} />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {groups.map(([group, groupItems]) => (
            <CommandGroup key={group} heading={group}>
              {groupItems.map((item, index) => (
                <CommandItem
                  key={`${item.href}:${item.title}:${index}`}
                  value={[
                    item.group,
                    item.title,
                    ...(item.keywords ?? []),
                  ].join(' ')}
                  onSelect={() => handleSelect(item.href)}
                >
                  <span className="truncate">{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}

function groupItems(
  items: TopbarSearchItem[]
): Array<[string, TopbarSearchItem[]]> {
  const groups = new Map<string, TopbarSearchItem[]>()

  for (const item of items) {
    const group = groups.get(item.group)
    if (group) {
      group.push(item)
    } else {
      groups.set(item.group, [item])
    }
  }

  return Array.from(groups.entries())
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false

  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"])'
    )
  )
}

function isPaletteTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false

  return Boolean(target.closest('[data-slot="command"]'))
}
