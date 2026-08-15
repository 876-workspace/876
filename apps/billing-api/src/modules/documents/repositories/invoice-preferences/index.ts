import { retrieve } from './retrieve'
import { update } from './update'
import { assessLateFees } from './late-fee'

export const invoicePreferences = { retrieve, update, assessLateFees }
