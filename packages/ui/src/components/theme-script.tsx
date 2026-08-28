import { THEME_STORAGE_KEY } from '../lib/theme-storage'

/**
 * The blocking script that applies the stored theme before first paint.
 *
 * Render it inside the document `<head>` of an app's root layout, above
 * `<body>`. It must run before the browser paints, otherwise a dark-theme
 * visitor sees a flash of the light theme on every hard load — which is why
 * this is a plain inline script and not an effect.
 *
 * It is deliberately separate from `ThemeProvider`: a `<script>` rendered by a
 * client component is never executed on the client, and React warns about it
 * in development. Emitting it from the server layout's `<head>` avoids both.
 *
 * ## The development warning is expected — do not "fix" it
 *
 * React logs "Encountered a script tag while rendering React component" when it
 * *mounts* this element on the client rather than hydrating it, which happens
 * on a Fast Refresh re-render. The warning lives only in
 * `react-dom-client.development.js`, so it never reaches production, and the
 * script has already run from the server HTML by then — which is the only run
 * that matters.
 *
 * Two escapes look tempting and are both worse:
 *
 * - A non-executable `type` silences the warning (React exempts data blocks)
 *   but is, by definition, a script that no longer runs.
 * - `next/script` with `strategy="beforeInteractive"` does **not** help. It
 *   renders the same raw inline `<script>` through React, so the warning is
 *   identical, and it replaces the body with a `self.__next_s.push(...)` queue
 *   drained by the Next.js runtime — which is after first paint, so every
 *   dark-theme visitor gets the flash this component exists to prevent.
 *
 * Verified against next@16.3.1 (`dist/client/script.js`) and its bundled
 * react-dom.
 */
export function ThemeScript({ nonce }: { nonce?: string }) {
  return (
    <script
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: themeScriptSource(THEME_STORAGE_KEY) }}
    />
  )
}

/**
 * Kept as a string rather than a serialized function so the emitted source is
 * exactly what is reviewed here — a bundler minifying an inlined function body
 * could otherwise change what runs before paint.
 */
function themeScriptSource(storageKey: string): string {
  return `(function(){try{var t=localStorage.getItem(${JSON.stringify(storageKey)});if(t!=="light"&&t!=="dark")t=null;var r=t||(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");var e=document.documentElement;e.classList.remove("light","dark");e.classList.add(r);e.style.colorScheme=r}catch(n){}})()`
}
