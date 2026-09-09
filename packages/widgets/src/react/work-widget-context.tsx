'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { WorkHostContext } from '@876/work'

type WorkWidgetContextState = {
  context: WorkHostContext | null
  setContext: React.Dispatch<React.SetStateAction<WorkHostContext | null>>
}

const WorkWidgetContext = createContext<WorkWidgetContextState | null>(null)

function sameContext(
  left: WorkHostContext | null,
  right: WorkHostContext
): boolean {
  return (
    left?.service === right.service &&
    left.resource === right.resource &&
    left.externalId === right.externalId
  )
}

export function WorkWidgetContextProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<WorkHostContext | null>(null)
  const value = useMemo(() => ({ context, setContext }), [context])

  return (
    <WorkWidgetContext.Provider value={value}>
      {children}
    </WorkWidgetContext.Provider>
  )
}

/**
 * Publishes an already-resolved host resource to the shared widget runtime.
 * The host BFF must authorize the resource again before contextual Work I/O.
 */
export function WorkWidgetContextSetter({
  context,
}: {
  context: WorkHostContext
}) {
  const state = useContext(WorkWidgetContext)

  useEffect(() => {
    if (!state) return
    state.setContext(context)

    return () => {
      state.setContext((current) =>
        sameContext(current, context) ? null : current
      )
    }
  }, [context, state])

  return null
}

export function useWorkWidgetHostContext(): WorkHostContext | null {
  return useContext(WorkWidgetContext)?.context ?? null
}
