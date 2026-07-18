import { create } from './create'
import { createAmendment, processDueAmendments } from './amendments'
import {
  createCharge,
  invoiceUnbilledCharges,
  listCharges,
  voidCharge,
} from './charges'
import { createDiscount, listDiscounts, removeDiscount } from './discounts'
import { ensure } from './ensure'
import {
  cancel,
  extend,
  pause,
  processDueLifecycleSchedules,
  reactivate,
  remove,
  resume,
} from './lifecycle'
import { listSubscriptions } from './list'
import {
  retrievePreferences,
  updateInvoiceModes,
  updatePreferences,
} from './preferences'
import { createView, deleteView, listViews, updateView } from './views'
import { retrieve } from './retrieve'
import { previewUpcomingInvoice } from './preview'
import { previewProration } from './preview-proration'
import { billSubscription } from './bill'
import { processAllDueSubscriptions, processDueSubscriptions } from './sweep'

export const subscriptions = {
  create,
  amendments: {
    create: createAmendment,
    processDue: processDueAmendments,
  },
  bill: billSubscription,
  cancel,
  charges: {
    create: createCharge,
    invoiceUnbilled: invoiceUnbilledCharges,
    list: listCharges,
    void: voidCharge,
  },
  delete: remove,
  discounts: {
    create: createDiscount,
    delete: removeDiscount,
    list: listDiscounts,
  },
  extend,
  processDue: processDueSubscriptions,
  processAllDue: processAllDueSubscriptions,
  processDueSchedules: processDueLifecycleSchedules,
  ensure,
  list: listSubscriptions,
  listSubscriptions,
  pause,
  preferences: {
    bulkUpdateInvoiceMode: updateInvoiceModes,
    retrieve: retrievePreferences,
    update: updatePreferences,
  },
  reactivate,
  retrieve,
  resume,
  views: {
    create: createView,
    delete: deleteView,
    list: listViews,
    update: updateView,
  },
  previewUpcomingInvoice,
  previewProration,
}
