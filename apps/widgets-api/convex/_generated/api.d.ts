/* eslint-disable */
/**
 * Generated `api` utility.
 * Run `npx convex dev` or `npx convex codegen` to regenerate.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from 'convex/server'
import type * as articles from '../articles.js'
import type * as bookmarks from '../bookmarks.js'
import type * as categories from '../categories.js'
import type * as cleanup from '../cleanup.js'

declare const fullApi: ApiFromModules<{
  articles: typeof articles
  bookmarks: typeof bookmarks
  categories: typeof categories
  cleanup: typeof cleanup
}>

export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, 'public'>
>

export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, 'internal'>
>
