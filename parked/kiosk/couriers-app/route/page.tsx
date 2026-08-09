'use client'

import {
  create876CouriersKioskClient,
  type KioskPackage,
} from '@876/couriers/kiosk'
import { useState } from 'react'

const credentialKey = '876:couriers:kiosk:credential'

export default function KioskPage() {
  const [credential, setCredential] = useState(() =>
    typeof window === 'undefined'
      ? ''
      : (window.localStorage.getItem(credentialKey) ?? '')
  )
  const [draftCredential, setDraftCredential] = useState('')
  const [mailbox, setMailbox] = useState('')
  const [code, setCode] = useState('')
  const [packages, setPackages] = useState<KioskPackage[]>([])
  const [message, setMessage] = useState('')
  const apiUrl = process.env.NEXT_PUBLIC_COURIERS_API_URL
  const client =
    credential && apiUrl
      ? create876CouriersKioskClient({ baseUrl: apiUrl, credential })
      : null
  async function lookup() {
    if (!client) return
    const result = await client.packages.lookup(mailbox, code)
    if (result.error) {
      setPackages([])
      setMessage(result.error.message)
      return
    }
    setPackages(result.data.data)
    setMessage(
      result.data.data.length ? '' : 'No packages are ready for collection.'
    )
  }
  async function collect(id: string) {
    if (!client) return
    const result = await client.packages.collect(id, code)
    if (result.error) {
      setMessage(result.error.message)
      return
    }
    setPackages((items) => items.filter((item) => item.id !== id))
    setMessage('Package marked as collected.')
  }
  if (!apiUrl)
    return (
      <main className="mx-auto max-w-md p-8">
        <h1 className="text-xl font-semibold">Kiosk is not configured</h1>
      </main>
    )
  if (!credential)
    return (
      <main className="mx-auto max-w-md space-y-4 p-8">
        <h1 className="text-xl font-semibold">Enroll this kiosk</h1>
        <p>Enter the device credential shown once by an administrator.</p>
        <input
          className="w-full rounded border p-3"
          onChange={(event) => setDraftCredential(event.target.value.trim())}
          placeholder="kdev_…"
        />
        <button
          className="rounded bg-black px-4 py-2 text-white"
          onClick={() => {
            if (draftCredential.startsWith('kdev_')) {
              window.localStorage.setItem(credentialKey, draftCredential)
              setCredential(draftCredential)
            }
          }}
        >
          Save credential
        </button>
      </main>
    )
  return (
    <main className="mx-auto max-w-md space-y-4 p-8">
      <h1 className="text-2xl font-semibold">Package pickup</h1>
      <label className="block">
        Mailbox number
        <input
          className="mt-1 w-full rounded border p-3"
          value={mailbox}
          onChange={(event) => setMailbox(event.target.value)}
        />
      </label>
      <label className="block">
        Pickup code
        <input
          className="mt-1 w-full rounded border p-3"
          inputMode="numeric"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      </label>
      <button
        className="rounded bg-black px-4 py-2 text-white"
        onClick={lookup}
      >
        Find packages
      </button>
      {message && <p role="status">{message}</p>}
      <ul className="space-y-2">
        {packages.map((item) => (
          <li className="rounded border p-3" key={item.id}>
            <p>{item.tracking_number ?? 'Untracked package'}</p>
            <p>{item.description}</p>
            <button
              className="mt-2 rounded border px-3 py-1"
              onClick={() => collect(item.id)}
            >
              Mark collected
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
