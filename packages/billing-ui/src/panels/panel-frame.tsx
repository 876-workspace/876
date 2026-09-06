import type { ReactNode } from 'react'
import { cn } from '@876/core/utils'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@876/ui/card'
import { Skeleton } from '@876/ui/skeleton'

import type { PanelProps, PanelState } from './panel'

export function PanelFrame({ title, action, className, children }: PanelProps & { title: string; children: ReactNode }) { return <Card className={cn('gap-0 py-0', className)}><CardHeader className="border-b py-4"><CardTitle>{title}</CardTitle>{action ? <CardAction>{action}</CardAction> : null}</CardHeader><CardContent className="py-5">{children}</CardContent></Card> }
export function PanelError({ error }: { error: PanelState<never> & { status: 'error' } }) { return <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"><p className="font-medium">This panel could not be loaded</p><p className="text-muted-foreground mt-1">{error.error.message}</p><p className="text-muted-foreground mt-2 text-xs">Code: {error.error.code}</p></div> }
export function PanelRowsSkeleton({ rows = 3 }: { rows?: number }) { return <div className="space-y-3" aria-label="Loading panel">{Array.from({ length: rows }, (_, index) => <Skeleton key={index} className="h-10 w-full" />)}</div> }
