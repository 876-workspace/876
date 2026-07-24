/**
 * Minimal `.env` file merging for the dev-environment setup scripts.
 *
 * These scripts own a handful of keys inside gitignored `.env*.local` files
 * that developers also hand-edit. Rewriting the whole file would silently drop
 * their edits, so updates are merged key-by-key instead.
 *
 * @module scripts/env-file
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

/**
 * Reads a single key's value out of an env file.
 *
 * @param path - Absolute path to the env file.
 * @param key - Env var name to look up.
 * @returns The value, or `undefined` when the file or key is absent.
 */
export function readEnvValue(path, key) {
  if (!existsSync(path)) return undefined

  const pattern = new RegExp(`^${key}=(.*)$`, 'm')
  return readFileSync(path, 'utf8').match(pattern)?.[1]?.trim() || undefined
}

/**
 * Sets the given keys in an env file, leaving every other line intact.
 *
 * Existing keys are rewritten in place (preserving file order); new keys are
 * appended. Comments, blank lines, and unrelated keys are untouched.
 *
 * @param path - Absolute path to the env file.
 * @param updates - Keys to set, mapped to their exact values.
 * @param header - Comment written at the top of a newly created file.
 */
export function mergeEnvFile(path, updates, header) {
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : ''
  const lines = existing ? existing.split('\n') : header ? [header] : []

  const remaining = new Map(Object.entries(updates))
  const merged = lines.map((line) => {
    const key = line.match(/^([A-Z0-9_]+)=/)?.[1]
    if (!key || !remaining.has(key)) return line

    const value = remaining.get(key)
    remaining.delete(key)
    return `${key}=${value}`
  })

  for (const [key, value] of remaining) merged.push(`${key}=${value}`)

  writeFileSync(path, `${merged.join('\n').replace(/\n+$/, '')}\n`)
}
