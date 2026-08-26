/**
 * The localStorage key holding the user's theme choice.
 *
 * This is `theme` rather than an 876-namespaced key on purpose: it is the key
 * next-themes used before the shared provider replaced it, and changing it
 * would silently reset the saved preference for every existing visitor.
 *
 * It lives in this plain module, not in `components/theme.tsx`, because that
 * file is `'use client'` — a value imported from a client module into a server
 * component arrives as a client reference, not the string, which silently
 * produced `localStorage.getItem(undefined)` in the pre-paint script.
 */
export const THEME_STORAGE_KEY = 'theme'
