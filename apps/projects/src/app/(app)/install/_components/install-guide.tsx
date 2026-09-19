'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@876/ui/button'

type Platform = 'ios' | 'android' | 'desktop'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
}

declare global {
  interface Navigator {
    standalone?: boolean
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

const PLATFORM_ORDER: Platform[] = ['ios', 'android', 'desktop']

function platformFor(userAgent: string): Platform {
  if (/iPad|iPhone|iPod/.test(userAgent)) return 'ios'
  if (/Android/.test(userAgent)) return 'android'
  return 'desktop'
}

export function InstallGuide() {
  const promptEvent = useRef<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [canPrompt, setCanPrompt] = useState(false)
  const [prompting, setPrompting] = useState(false)
  const [platformOrder, setPlatformOrder] = useState(PLATFORM_ORDER)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && navigator.standalone === true)
    setInstalled(standalone)

    const promptForInstall = (event: BeforeInstallPromptEvent) => {
      event.preventDefault()
      promptEvent.current = event
      setCanPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', promptForInstall)
    setPlatformOrder((order) => {
      const current = platformFor(navigator.userAgent)
      return [current, ...order.filter((platform) => platform !== current)]
    })

    return () =>
      window.removeEventListener('beforeinstallprompt', promptForInstall)
  }, [])

  async function install() {
    const event = promptEvent.current
    if (!event) return

    setPrompting(true)
    try {
      await event.prompt()
    } finally {
      promptEvent.current = null
      setCanPrompt(false)
      setPrompting(false)
    }
  }

  if (installed) {
    return (
      <div className="text-muted-foreground">876 Projects is installed.</div>
    )
  }

  return (
    <div className="space-y-8">
      {canPrompt ? (
        <Button
          variant="info"
          disabled={prompting}
          onClick={() => void install()}
        >
          Install
        </Button>
      ) : null}
      {platformOrder.map((platform) => (
        <PlatformInstructions key={platform} platform={platform} />
      ))}
      <section>
        <h2 className="text-lg font-semibold">After you install</h2>
        <ul className="text-muted-foreground mt-3 list-disc space-y-2 pl-5 text-[0.9375rem]">
          <li>Opens without browser chrome.</li>
          <li>Keeps you signed in.</li>
          <li>Opens a /i/&lt;ref&gt; link straight to that issue.</li>
        </ul>
      </section>
    </div>
  )
}

function PlatformInstructions({ platform }: { platform: Platform }) {
  if (platform === 'ios') {
    return (
      <section>
        <h2 className="text-lg font-semibold">iPhone / iPad (Safari)</h2>
        <ol className="text-muted-foreground mt-3 list-decimal space-y-2 pl-5 text-[0.9375rem]">
          <li>
            Open 876 Projects in Safari; Chrome on iOS cannot install a web app.
          </li>
          <li>Tap Share.</li>
          <li>
            Tap <em>Add to Home Screen</em>, then Add.
          </li>
        </ol>
      </section>
    )
  }

  if (platform === 'android') {
    return (
      <section>
        <h2 className="text-lg font-semibold">Android (Chrome)</h2>
        <ol className="text-muted-foreground mt-3 list-decimal space-y-2 pl-5 text-[0.9375rem]">
          <li>Open the ⋮ menu.</li>
          <li>
            Tap <em>Add to Home screen</em> or <em>Install app</em>.
          </li>
          <li>Tap Install.</li>
        </ol>
      </section>
    )
  }

  return (
    <section>
      <h2 className="text-lg font-semibold">Desktop (Chrome / Edge)</h2>
      <ol className="text-muted-foreground mt-3 list-decimal space-y-2 pl-5 text-[0.9375rem]">
        <li>Click the install icon in the address bar, or open the ⋮ menu.</li>
        <li>
          Click <em>Install 876 Projects</em>.
        </li>
      </ol>
    </section>
  )
}
