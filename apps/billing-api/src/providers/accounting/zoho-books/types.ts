export interface ZohoPageContext {
  page: number
  per_page: number
  has_more_page: boolean
}

export interface ZohoContact {
  contact_id: string
  contact_name: string
  company_name?: string
  email?: string
  phone?: string
  status?: string
}

export interface ZohoItem {
  item_id: string
  name: string
  sku?: string
  rate?: number
  status?: string
}

export interface ZohoEstimate {
  estimate_id: string
  estimate_number?: string
  status?: string
}

export interface ZohoInvoice {
  invoice_id: string
  invoice_number?: string
  status?: string
}

export interface ZohoRecurringInvoice {
  recurring_invoice_id: string
  recurrence_name?: string
  status?: string
}

export interface ZohoCustomerPayment {
  payment_id: string
  status?: string
}

export interface ZohoContactInput {
  contact_name: string
  company_name?: string
  contact_type: 'customer'
  email?: string
  phone?: string
  custom_fields?: Array<{ label: string; value: string }>
}

export interface ZohoItemInput {
  name: string
  sku?: string
  unit?: string
  description?: string
  rate?: number
  product_type?: 'goods' | 'service'
  item_type?: 'sales'
  is_taxable?: boolean
  custom_fields?: Array<{ label: string; value: string }>
}

export interface ZohoLineItemInput {
  item_id?: string
  description?: string
  quantity: number
  rate: number
}

export interface ZohoEstimateInput {
  customer_id: string
  estimate_number?: string
  date?: string
  expiry_date?: string
  line_items: ZohoLineItemInput[]
  notes?: string
  terms?: string
  custom_fields?: Array<{ label: string; value: string }>
}

export interface ZohoInvoiceInput {
  customer_id: string
  invoice_number?: string
  date?: string
  due_date?: string
  reference_number?: string
  line_items: ZohoLineItemInput[]
  notes?: string
  terms?: string
  custom_fields?: Array<{ label: string; value: string }>
}

export interface ZohoRecurringInvoiceInput {
  customer_id: string
  recurrence_name: string
  start_date?: string
  end_date?: string
  recurrence_frequency: 'days' | 'weeks' | 'months' | 'years'
  repeat_every: number
  line_items: ZohoLineItemInput[]
  custom_fields?: Array<{ label: string; value: string }>
}

export interface ZohoCustomerPaymentInput {
  customer_id: string
  payment_mode: string
  amount: number
  date: string
  reference_number?: string
  description?: string
  invoices?: Array<{ invoice_id: string; amount_applied: number }>
  custom_fields?: Array<{ label: string; value: string }>
}
