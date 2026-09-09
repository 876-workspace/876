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
import {
  browserWork,
  createBrowserWork,
  type WorkBrowserClient,
} from '@876/work/browser'

type WorkWidgetHostBinding = {
  context: WorkHostContext | null
  client: WorkBrowserClient
}

type WorkWidgetContextState = WorkWidgetHostBinding & {
  setBinding: React.Dispatch<React.SetStateAction<WorkWidgetHostBinding>>
}

const WorkWidgetContext = createContext<WorkWidgetContextState | null>(null)

export function WorkWidgetContextProvider({
  children,
}: {
  children: ReactNode
}) {
  const [binding, setBinding] = useState<WorkWidgetHostBinding>({
    context: null,
    client: browserWork,
  })
  const value = useMemo(() => ({ ...binding, setBinding }), [binding])

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
  routeBase,
}: {
  context: WorkHostContext
  routeBase: string
}) {
  const state = useContext(WorkWidgetContext)
  const setBinding = state?.setBinding
  const binding = useMemo(
    () => ({
      context,
      client: createBrowserWork({ contextRouteBase: routeBase }),
    }),
    [context, routeBase]
  )

  useEffect(() => {
    if (!setBinding) return
    setBinding(binding)

    return () => {
      setBinding((current) =>
        current === binding ? { context: null, client: browserWork } : current
      )
    }
  }, [binding, setBinding])

  return null
}

export function useWorkWidgetHostContext(): WorkHostContext | null {
  return useContext(WorkWidgetContext)?.context ?? null
}

export function useWorkWidgetBrowserClient(): WorkBrowserClient {
  return useContext(WorkWidgetContext)?.client ?? browserWork
}
