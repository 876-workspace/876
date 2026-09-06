import type { ReactNode } from 'react'

/** The explicit presentation state every finance panel receives from its host. */
export type PanelState<T> =
  | { status: 'ready'; data: T }
  | { status: 'empty' }
  | { status: 'error'; error: { code: string; message: string } }

export interface PanelProps {
  className?: string
  /** Host-owned affordance rendered at the right side of the panel header. */
  action?: ReactNode
}
