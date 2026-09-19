import type { Metadata } from 'next'

import { InstallGuide } from './_components/install-guide'

export const metadata: Metadata = { title: 'Install' }

export default function InstallPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <h1 className="876-page-title mb-6">Install</h1>
      <InstallGuide />
    </div>
  )
}
