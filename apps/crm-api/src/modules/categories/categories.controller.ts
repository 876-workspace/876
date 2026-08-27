import type { Request, Response } from 'express'
import * as x from './categories.service.js'
import * as s from './categories.schemas.js'
const miss = (
  r: Response,
  code = 'crm/category-not-found',
  message = 'Request category not found.'
) => r.status(404).json({ data: null, error: { code, message } })
const list = (r: Response, d: unknown[], u: string) =>
  r.json({
    data: {
      object: 'list',
      data: d,
      has_more: false,
      total_count: d.length,
      url: u,
    },
    error: null,
  })
export async function all(q: Request, r: Response) {
  const p = s.org.parse(q.params)
  list(
    r,
    await x.list(p.organizationId),
    `/v1/organizations/${p.organizationId}/request-categories`
  )
}
export async function get(q: Request, r: Response) {
  const p = s.category.parse(q.params),
    d = await x.retrieve(p.organizationId, p.id)
  if (!d) return miss(r)
  r.json({ data: d, error: null })
}
export async function create(q: Request, r: Response) {
  const p = s.org.parse(q.params)
  r.status(201).json({
    data: await x.create(p.organizationId, s.create.parse(q.body)),
    error: null,
  })
}
export async function update(q: Request, r: Response) {
  const p = s.category.parse(q.params),
    d = await x.update(p.organizationId, p.id, s.update.parse(q.body))
  if (!d) return miss(r)
  r.json({ data: d, error: null })
}
export async function remove(q: Request, r: Response) {
  const p = s.category.parse(q.params),
    d = await x.remove(p.organizationId, p.id, s.deletion.parse(q.body))
  if (!d) return miss(r)
  r.json({ data: d, error: null })
}
export async function addSub(q: Request, r: Response) {
  const p = s.category.parse(q.params)
  r.status(201).json({
    data: await x.createSub(p.organizationId, p.id, s.create.parse(q.body)),
    error: null,
  })
}
export async function patchSub(q: Request, r: Response) {
  const p = s.subcategory.parse(q.params),
    d = await x.updateSub(
      p.organizationId,
      p.id,
      p.subcategoryId,
      s.update.parse(q.body)
    )
  if (!d)
    return miss(
      r,
      'crm/subcategory-not-found',
      'Request subcategory not found.'
    )
  r.json({ data: d, error: null })
}
export async function deleteSub(q: Request, r: Response) {
  const p = s.subcategory.parse(q.params),
    d = await x.removeSub(
      p.organizationId,
      p.id,
      p.subcategoryId,
      s.deletion.parse(q.body)
    )
  if (!d)
    return miss(
      r,
      'crm/subcategory-not-found',
      'Request subcategory not found.'
    )
  r.json({ data: d, error: null })
}
