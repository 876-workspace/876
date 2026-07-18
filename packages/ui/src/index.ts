// @876/ui — shared UI package (shadcn/ui base-vega + design tokens).
//
// Components are exposed as subpath exports; import them directly, e.g.
//   import { Button } from '@876/ui/button'
//   import { Card, CardHeader } from '@876/ui/card'
//
// This barrel re-exports the shared utilities and hooks that are not
// component-scoped.
export * from './lib/utils'
export * from './hooks/use-mobile'
