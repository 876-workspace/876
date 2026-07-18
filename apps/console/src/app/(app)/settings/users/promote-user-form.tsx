'use client'

import { useState, useTransition } from 'react'
import type { AdminUser } from '@876/admin'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Button } from '@876/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'
import { AnalyticsEvent } from '@/lib/analytics/events'
import { track } from '@/lib/analytics/track'
import { useConsoleUser } from '@/stores/user'
import { SearchInput } from '@/components/search-input'
import { client } from '@/lib/client'

const ROLE_LABELS: Record<string, string> = {
  staff: 'Staff',
  admin: 'Admin',
  super_admin: 'Super Admin',
}

export function PromoteUserForm() {
  const actor = useConsoleUser()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AdminUser[]>([])
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [role, setRole] = useState('staff')
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [isSearching, startSearch] = useTransition()
  const [isPromoting, startPromote] = useTransition()

  function handleSearch() {
    if (query.trim().length < 2) return
    setFeedback(null)
    startSearch(async () => {
      const { data, error } = await client.users.search(query)
      if (error || !data) {
        setFeedback({
          type: 'error',
          message: error?.message ?? 'Search failed.',
        })
        setResults([])
      } else {
        track(AnalyticsEvent.UserSearched, {
          properties: {
            actor_user_id: actor?.id ?? null,
            query_length: query.trim().length,
            result_count: data.length,
          },
        })
        setResults(data)
      }
    })
  }

  function handleSelect(user: AdminUser) {
    setSelected(user)
    setResults([])
    setQuery('')
    setFeedback(null)
  }

  function handlePromote() {
    if (!selected) return
    setFeedback(null)
    startPromote(async () => {
      const { data, error } = await client.users.setRole(selected.id, role)
      if (error || !data) {
        setFeedback({
          type: 'error',
          message: error?.message ?? 'Failed to update user.',
        })
      } else {
        track(AnalyticsEvent.UserRoleChanged, {
          properties: {
            target_user_id: selected.id,
            actor_user_id: actor?.id ?? null,
            to_role: role,
          },
        })
        track(AnalyticsEvent.TeamMemberInvited, {
          properties: {
            actor_user_id: actor?.id ?? null,
          },
        })
        setFeedback({
          type: 'success',
          message: `${selected.email} has been granted ${ROLE_LABELS[role] ?? role} access.`,
        })
        setSelected(null)
        setRole('staff')
      }
    })
  }

  return (
    <div className="space-y-4">
      <SearchInput
        value={query}
        onChange={setQuery}
        onSearch={handleSearch}
        placeholder="Search by email, username, or name…"
        isPending={isSearching}
      />

      {/* Search results */}
      {results.length > 0 && (
        <div className="876-card overflow-hidden">
          {results.map((user) => {
            const displayName =
              [user.first_name, user.last_name].filter(Boolean).join(' ') ||
              user.email
            return (
              <button
                key={user.id}
                className="hover:bg-muted flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                onClick={() => handleSelect(user)}
              >
                <Avatar className="size-7 shrink-0">
                  {user.avatar && <AvatarImage src={user.avatar} alt="" />}
                  <AvatarFallback className="text-xs">
                    {user.first_name?.[0]?.toUpperCase() ||
                      user.email[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{displayName}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Selected user + role */}
      {selected && (
        <div className="876-card p-5">
          <div className="mb-3 flex items-center gap-3">
            <Avatar className="size-8">
              {selected.avatar && <AvatarImage src={selected.avatar} alt="" />}
              <AvatarFallback className="text-xs">
                {selected.first_name?.[0]?.toUpperCase() ||
                  selected.email[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">
                {[selected.first_name, selected.last_name]
                  .filter(Boolean)
                  .join(' ') || selected.email}
              </p>
              <p className="text-muted-foreground text-xs">{selected.email}</p>
            </div>
            <button
              className="text-muted-foreground hover:text-foreground ml-auto text-xs"
              onClick={() => setSelected(null)}
            >
              Clear
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Select value={role} onValueChange={(v) => v && setRole(v)}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff — read-only access</SelectItem>
                <SelectItem value="admin">
                  Admin — full management access
                </SelectItem>
                <SelectItem value="super_admin">
                  Super Admin — all permissions
                </SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handlePromote} disabled={isPromoting}>
              {isPromoting ? 'Saving…' : 'Grant Access'}
            </Button>
          </div>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <p
          className={
            feedback.type === 'success'
              ? 'text-sm text-green-600 dark:text-green-400'
              : 'text-destructive text-sm'
          }
        >
          {feedback.message}
        </p>
      )}
    </div>
  )
}
