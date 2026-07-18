'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { browserNotes } from '@876/widgets/browser'
import type { NotepadNote } from '@876/widgets'
import { buttonVariants } from '@876/ui/button'
import { toast } from 'sonner'

export function NotepadAdminManager() {
  return <NotepadAdminTable />
}

function NotepadAdminTable() {
  const [ownerInput, setOwnerInput] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [results, setResults] = useState<NotepadNote[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [saving, setSaving] = useState(false)
  const editing = results.find((entry) => entry.id === editingId)

  const load = useCallback(
    async (cursor?: string) => {
      setLoading(true)
      const result = await browserNotes.listAll({
        owner_account_id: ownerFilter || undefined,
        limit: 50,
        starting_after: cursor,
      })
      setLoading(false)
      if (result.error !== null) {
        toast.error(result.error)
        return
      }
      setResults((prev) =>
        cursor ? [...prev, ...result.data.data] : result.data.data
      )
      setHasMore(result.data.has_more)
    },
    [ownerFilter]
  )

  useEffect(() => {
    void load()
  }, [load])

  function filterOwner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOwnerFilter(ownerInput.trim())
    setEditingId(null)
  }

  function edit(entry: NotepadNote) {
    setEditingId(entry.id)
    setEditTitle(entry.title)
    setEditBody(entry.body)
  }

  async function save() {
    if (!editingId || !editTitle.trim()) return
    setSaving(true)
    try {
      const result = await browserNotes.adminUpdate(editingId, {
        title: editTitle,
        body: editBody,
      })
      if (result.error !== null) {
        toast.error(result.error)
        return
      }
      toast.success('Notepad entry updated.')
      setEditingId(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function remove(entryId: string) {
    if (!window.confirm('Delete this note permanently?')) return
    const result = await browserNotes.adminDelete(entryId)
    if (result.error !== null) {
      toast.error(result.error)
      return
    }
    if (editingId === entryId) setEditingId(null)
    toast.success('Notepad entry deleted.')
    await load()
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold">All Notepad data</h2>
      </div>

      <form
        onSubmit={filterOwner}
        className="flex max-w-xl flex-col gap-2 sm:flex-row"
      >
        <input
          value={ownerInput}
          onChange={(event) => setOwnerInput(event.target.value)}
          placeholder="Exact 876 account ID"
          aria-label="876 account ID"
          className="border-input bg-background h-9 min-w-0 flex-1 rounded-md border px-3 text-sm"
        />
        <button
          type="submit"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Filter
        </button>
        {ownerFilter ? (
          <button
            type="button"
            onClick={() => {
              setOwnerInput('')
              setOwnerFilter('')
            }}
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            All accounts
          </button>
        ) : null}
      </form>

      {editing ? (
        <section className="876-card space-y-4 p-5">
          <div>
            <h3 className="font-semibold">Edit note</h3>
            <p className="text-muted-foreground mt-1 font-mono text-xs">
              Owner: {editing.owner_account_id}
            </p>
          </div>
          <label className="block space-y-1.5 text-sm font-medium">
            <span>Title</span>
            <input
              value={editTitle}
              maxLength={160}
              onChange={(event) => setEditTitle(event.target.value)}
              className="border-input bg-background h-9 w-full rounded-md border px-3 font-normal"
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            <span>Body</span>
            <textarea
              value={editBody}
              maxLength={100_000}
              onChange={(event) => setEditBody(event.target.value)}
              className="border-input bg-background min-h-52 w-full resize-y rounded-md border p-3 leading-6 font-normal"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className={buttonVariants({ variant: 'info', size: 'sm' })}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </section>
      ) : null}

      <div className="876-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Owner</th>
              <th className="px-3 py-2 font-medium">Updated</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {results.map((entry) => (
              <tr key={entry.id} className="border-t">
                <td className="px-3 py-2">{entry.title}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {entry.owner_account_id}
                </td>
                <td className="px-3 py-2 text-xs tabular-nums">
                  {entry.updated_at}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                    onClick={() => edit(entry)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={buttonVariants({
                      variant: 'ghost',
                      size: 'sm',
                    })}
                    onClick={() => void remove(entry.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!loading && results.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="text-muted-foreground px-3 py-8 text-center"
                >
                  No notes found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {hasMore ? (
        <button
          type="button"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
          onClick={() => {
            const last = results[results.length - 1]
            if (last) void load(last.id)
          }}
        >
          Load more
        </button>
      ) : null}
    </div>
  )
}
