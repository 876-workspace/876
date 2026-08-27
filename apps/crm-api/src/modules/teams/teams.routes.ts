import { Router } from 'express'
import { requireInternal } from '../../http/internal-auth.js'
import * as c from './teams.controller.js'
export function createTeamsRouter() {
  const r = Router({ mergeParams: true })
  r.get('/', requireInternal, c.list)
  r.post('/', requireInternal, c.create)
  r.get('/:id', requireInternal, c.get)
  r.patch('/:id', requireInternal, c.update)
  r.delete('/:id', requireInternal, c.remove)
  r.get('/:id/members', requireInternal, c.members)
  r.post('/:id/members', requireInternal, c.addMember)
  r.patch('/:id/members/:userId', requireInternal, c.updateMember)
  r.delete('/:id/members/:userId', requireInternal, c.removeMember)
  return r
}
