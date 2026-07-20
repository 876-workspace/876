import {
  backfillOrgOwnerContacts,
  resolveOrgOwner,
  syncOrgOwnerContact,
} from './core-sync'
import { create } from './create'
import { account } from './account'
import { deleteCustomer } from './delete'
import { ensure } from './ensure'
import { importCustomers } from './import'
import {
  listCustomerPage,
  listCustomers,
  listDocumentRecipients,
  receivablesByCustomer,
} from './list'
import { retrieve } from './retrieve'
import { recordOpeningBalance } from './opening-balance'
import { update } from './update'

export const customers = {
  backfillOrgOwnerContacts,
  account,
  create,
  delete: deleteCustomer,
  ensure,
  import: importCustomers,
  list: listCustomers,
  listDocumentRecipients,
  listPage: listCustomerPage,
  listCustomers,
  receivablesByCustomer,
  recordOpeningBalance,
  resolveOrgOwner,
  syncOrgOwnerContact,
  retrieve,
  update,
}
