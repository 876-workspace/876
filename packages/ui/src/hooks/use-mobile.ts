import * as React from 'react'

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribeToMobileChanges,
    getMobileSnapshot,
    getServerMobileSnapshot
  )
}

function subscribeToMobileChanges(onStoreChange: () => void): () => void {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener('change', onStoreChange)

  return () => mql.removeEventListener('change', onStoreChange)
}

function getMobileSnapshot(): boolean {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function getServerMobileSnapshot(): boolean {
  return false
}
