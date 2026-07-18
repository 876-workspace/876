'use client'

/**
 * Configuration context for the embeddable auth UI.
 *
 * @module @876/ui/auth/context
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react'

import { resolveCapabilities, resolveLabels } from './capabilities'
import { createDefaultIdentifierResolver } from './resolve-identifier'
import type {
  AuthCapabilities,
  AuthLabels,
  AuthUIConfig,
  AuthUIEvent,
  IdentifierResolution,
} from './types'

type AuthUIContextValue = {
  config: AuthUIConfig
  capabilities: AuthCapabilities
  labels: AuthLabels
  resolveIdentifier: (identifier: string) => Promise<IdentifierResolution>
  emit: (event: AuthUIEvent) => void
}

const AuthUIContext = createContext<AuthUIContextValue | null>(null)

/**
 * Provides flow configuration to every component beneath it. Render this once
 * around an {@link AuthFlow} (or any individual step) per app.
 *
 * @example
 * ```tsx
 * <AuthProvider config={{ mode: 'consumer', client, onSuccess }}>
 *   <AuthFlow />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({
  config,
  children,
}: {
  config: AuthUIConfig
  children: ReactNode
}) {
  const value = useMemo<AuthUIContextValue>(() => {
    const capabilities = resolveCapabilities(config.mode)
    const labels = resolveLabels(config.mode, config.labels)
    const resolveIdentifier =
      config.resolveIdentifier ?? createDefaultIdentifierResolver(config.client)

    const emit = (event: AuthUIEvent) => {
      config.onEvent?.(event)
    }

    return { config, capabilities, labels, resolveIdentifier, emit }
  }, [config])

  return (
    <AuthUIContext.Provider value={value}>
      <div
        data-auth-ui-mode={config.mode}
        className="max-sm:flex max-sm:flex-1 max-sm:flex-col"
        style={
          config.accentColor
            ? ({ ['--auth-accent']: config.accentColor } as React.CSSProperties)
            : undefined
        }
      >
        {children}
      </div>
    </AuthUIContext.Provider>
  )
}

/**
 * Reads the auth UI configuration. Throws if used outside {@link AuthProvider}.
 */
export function useAuthUI(): AuthUIContextValue {
  const value = useContext(AuthUIContext)

  if (!value) {
    throw new Error('useAuthUI must be used within an <AuthProvider>.')
  }

  return value
}
