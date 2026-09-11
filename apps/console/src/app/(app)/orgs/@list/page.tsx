/**
 * The index state of the slot. A required catch-all covers the detail routes,
 * because an optional catch-all would share `/orgs`'s specificity with the
 * `(list)` page and Next.js refuses to build the route table.
 */
export { default } from './[...segments]/page'
