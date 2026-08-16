'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PwaContextValue {
  isOnline: boolean
  isUpdateAvailable: boolean
  updateServiceWorker: () => void
  isInstallable: boolean
  promptInstall: () => Promise<boolean>
}

const PwaContext = createContext<PwaContextValue | null>(null)

export function PwaProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<boolean>(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Handle PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Handle Service Worker update lifecycle
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          setWaitingWorker(registration.waiting)
          setIsUpdateAvailable(true)
        }

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing
          if (!installingWorker) return

          installingWorker.addEventListener('statechange', () => {
            if (
              installingWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              setWaitingWorker(installingWorker)
              setIsUpdateAvailable(true)
            }
          })
        })
      })

      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true
          window.location.reload()
        }
      })
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      )
    }
  }, [])

  const updateServiceWorker = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    }
  }, [waitingWorker])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    return outcome === 'accepted'
  }, [deferredPrompt])

  return (
    <PwaContext.Provider
      value={{
        isOnline,
        isUpdateAvailable,
        updateServiceWorker,
        isInstallable: !!deferredPrompt,
        promptInstall,
      }}
    >
      {children}
    </PwaContext.Provider>
  )
}

export function usePwa() {
  const context = useContext(PwaContext)
  if (!context) {
    throw new Error('usePwa must be used within a PwaProvider')
  }
  return context
}
