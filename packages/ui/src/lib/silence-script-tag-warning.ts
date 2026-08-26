/**
 * Silences React's development-only "Encountered a script tag while rendering
 * React component" warning for the pre-paint theme script.
 *
 * The warning is a false positive for this pattern. React logs it from its
 * client-*create* path, meaning a script it created on the client will not
 * execute — which is true and irrelevant here: the theme script has already
 * run from the server-rendered HTML before first paint, which is the entire
 * point of it. The theme is applied correctly either way.
 *
 * It cannot be fixed at the source without removing the script entirely, and
 * every alternative is worse: `next/script` with `beforeInteractive` still
 * renders a script element *and* defers execution to the Next runtime,
 * reintroducing the flash the script exists to prevent, while resolving the
 * theme from a cookie server-side would opt every route out of static
 * rendering.
 *
 * Deliberately narrow:
 *   - development only — the string does not exist in production React;
 *   - exact match on that one message, so no other error is ever swallowed;
 *   - installed once, here, rather than copy-pasted into each app.
 *
 * Remove this if React stops warning for scripts that hydrated from SSR
 * output, or if the pre-paint script itself ever goes away.
 */
const MESSAGE = 'Encountered a script tag while rendering React component.'

let installed = false

export function silenceScriptTagWarning(): void {
  if (installed) return
  if (process.env.NODE_ENV !== 'development') return
  if (typeof window === 'undefined') return

  installed = true

  const original = console.error
  console.error = (...args: unknown[]) => {
    const [first] = args
    if (typeof first === 'string' && first.startsWith(MESSAGE)) return
    original.apply(console, args)
  }
}
