'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { XIcon } from '@876/ui/icons'
import { cn } from '@876/core/utils'
import type { RoleView } from '@/types/role'

export function RoleCardFrame({
  role,
  children,
}: {
  role: RoleView
  children: ReactNode
}) {
  const router = useRouter()

  return (
    <section
      aria-label={`Role details: ${role.displayName}`}
      className={cn(
        '876-card flex h-full min-w-0 flex-col overflow-hidden',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-300 motion-safe:ease-out'
      )}
    >
      <header className="border-876-surface-border flex shrink-0 items-start gap-4 border-b px-6 py-5">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-foreground truncate text-lg font-semibold tracking-tight sm:text-xl">
              {role.displayName}
            </h2>
            <Badge variant={role.isSystem ? 'outline' : 'secondary'}>
              {role.isSystem ? 'System' : 'Custom'}
            </Badge>
          </div>
          <p className="text-muted-foreground truncate font-mono text-xs">
            {role.name}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => router.push('/settings/users/roles')}
          aria-label="Close role details"
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <XIcon className="size-4" />
        </Button>
      </header>

      <div className="876-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
        {children}
      </div>

      <footer className="border-876-surface-border bg-muted/30 text-muted-foreground shrink-0 border-t px-6 py-2.5 font-mono text-xs">
        {role.name}
      </footer>
    </section>
  )
}
