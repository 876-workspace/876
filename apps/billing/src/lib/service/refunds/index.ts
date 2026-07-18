import { create } from './create'
import { listRefunds } from './list'
import { retrieve } from './retrieve'

export const refunds = {
  create,
  list: listRefunds,
  retrieve,
}
