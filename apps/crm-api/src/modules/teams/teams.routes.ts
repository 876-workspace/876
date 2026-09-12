import { Router } from 'express'
import { requireInternalOrServiceApp } from '../../http/service-auth.js'
import * as c from './teams.controller.js'
export function createTeamsRouter() {
  const r = Router({ mergeParams: true })
  r.get('/', requireInternalOrServiceApp, c.list)
  r.post('/', requireInternalOrServiceApp, c.create)
  r.get('/:id', requireInternalOrServiceApp, c.get)
  r.patch('/:id', requireInternalOrServiceApp, c.update)
  r.delete('/:id', requireInternalOrServiceApp, c.remove)
  r.get('/:id/members', requireInternalOrServiceApp, c.members)
  r.post('/:id/members', requireInternalOrServiceApp, c.addMember)
  r.patch('/:id/members/:userId', requireInternalOrServiceApp, c.updateMember)
  r.delete('/:id/members/:userId', requireInternalOrServiceApp, c.removeMember)
  return r
}
