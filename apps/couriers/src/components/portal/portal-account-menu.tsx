'use client'

import { useState } from 'react'

import { buttonVariants } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { ChevronDown, LogOut, User } from '@876/ui/icons'

import { request } from '@/lib/client/request'

export function PortalAccountMenu({
  label,
  email,
}: {
  label: string
  email: string
}) {
  const [busy, setBusy] = useState(false)

  async function handleSignOut() {
    if (busy) return
    setBusy(true)

    try {
      await request<unknown>('/api/auth/logout', { method: 'POST' })
    } finally {
      window.location.href = '/portal/login'
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open account menu"
        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
      >
        <User className="size-4" />
        <span className="hidden max-w-36 truncate sm:inline">{label}</span>
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <span className="text-foreground block truncate">{label}</span>
          <span className="block truncate font-normal">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={busy} onClick={() => void handleSignOut()}>
          <LogOut className="size-4" />
          {busy ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
