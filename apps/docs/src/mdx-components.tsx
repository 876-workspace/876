import defaultMdxComponents from 'fumadocs-ui/mdx'
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion'
import { Callout as FumaCallout } from 'fumadocs-ui/components/callout'
import { Card, Cards } from 'fumadocs-ui/components/card'
import { Step, Steps } from 'fumadocs-ui/components/steps'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'
import { TypeTable } from 'fumadocs-ui/components/type-table'
import type { MDXComponents } from 'mdx/types'
import type { ComponentProps } from 'react'
import {
  APIClientUsageMap,
  RouteDoc,
  RouteIndex,
} from '@/components/api-internals'
import { APIReference } from '@/components/api-reference'
import { Method } from '@/components/method'
import { Param, Parameters } from '@/components/parameters'

/**
 * [A3] Thin wrapper that tags every Fumadocs callout with a stable `callout-876`
 * class. The "pop" styling (flush full-strength accent bar + larger icon) is driven
 * entirely from that hook in global.css, so no per-callout MDX edits are needed.
 * See style-refresh-tracker.md.
 */
function Callout({ className, ...props }: ComponentProps<typeof FumaCallout>) {
  return (
    <FumaCallout
      className={['callout-876', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}

/**
 * Component map injected into every MDX page. Includes Fumadocs primitives plus
 * the custom SDK-docs components (`Method` three-column layout, `APIReference`
 * collapsible Swagger block, `TypeTable` for props/returns).
 */
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Accordion,
    Accordions,
    Callout,
    Card,
    Cards,
    Step,
    Steps,
    Tab,
    Tabs,
    TypeTable,
    Method,
    APIReference,
    RouteDoc,
    RouteIndex,
    APIClientUsageMap,
    Parameters,
    Param,
    ...components,
  }
}
