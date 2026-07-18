import type {
  BankAccountCreateParams as ClientBankAccountCreateParams,
  BankAccountUpdateParams as ClientBankAccountUpdateParams,
  BankTransactionCreateParams as ClientBankTransactionCreateParams,
  BankTransactionUpdateParams as ClientBankTransactionUpdateParams,
  CustomerCreateParams as ClientCustomerCreateParams,
  InvoiceCreateParams as ClientInvoiceCreateParams,
  PaymentCreateParams as ClientPaymentCreateParams,
  PaymentModeCreateParams as ClientPaymentModeCreateParams,
  PaymentModeUpdateParams as ClientPaymentModeUpdateParams,
  PaymentUpdateParams as ClientPaymentUpdateParams,
  SubscriptionCreateParams as ClientSubscriptionCreateParams,
} from '@876/billing'
import type {
  CustomerEnsureParams as ClientCustomerEnsureParams,
  PlanEnsureParams as ClientPlanEnsureParams,
  PriceEnsureParams as ClientPriceEnsureParams,
  ProductEnsureParams as ClientProductEnsureParams,
  SubscriptionEnsureParams as ClientSubscriptionEnsureParams,
} from '@876/billing/admin'
import type { z } from 'zod'

import type { CustomerCreateInput } from './customer'
import type {
  BankAccountCreateInput,
  BankAccountUpdateInput,
  BankTransactionCreateInput,
  BankTransactionUpdateInput,
} from './banking'
import type { InvoiceCreateInput } from './invoice'
import type {
  PaymentCreateInput,
  PaymentModeCreateInput,
  PaymentModeUpdateInput,
  PaymentUpdateInput,
} from './payment'
import type { SubscriptionCreateInput } from './subscription'
import {
  CustomerEnsureSchema,
  PlanEnsureSchema,
  PriceEnsureSchema,
  ProductEnsureSchema,
  SubscriptionEnsureSchema,
} from './sync'

type Equivalent<TLeft, TRight> = [TLeft] extends [TRight]
  ? [TRight] extends [TLeft]
    ? true
    : false
  : false
type Assert<TValue extends true> = TValue

type CustomerCreateContractMatches = Assert<
  Equivalent<CustomerCreateInput, ClientCustomerCreateParams>
>
type BankAccountCreateContractMatches = Assert<
  Equivalent<BankAccountCreateInput, ClientBankAccountCreateParams>
>
type BankAccountUpdateContractMatches = Assert<
  Equivalent<BankAccountUpdateInput, ClientBankAccountUpdateParams>
>
type BankTransactionCreateContractMatches = Assert<
  Equivalent<BankTransactionCreateInput, ClientBankTransactionCreateParams>
>
type BankTransactionUpdateContractMatches = Assert<
  Equivalent<BankTransactionUpdateInput, ClientBankTransactionUpdateParams>
>
type InvoiceCreateContractMatches = Assert<
  Equivalent<InvoiceCreateInput, ClientInvoiceCreateParams>
>
type PaymentModeCreateContractMatches = Assert<
  Equivalent<PaymentModeCreateInput, ClientPaymentModeCreateParams>
>
type PaymentModeUpdateContractMatches = Assert<
  Equivalent<PaymentModeUpdateInput, ClientPaymentModeUpdateParams>
>
type PaymentCreateContractMatches = Assert<
  Equivalent<PaymentCreateInput, ClientPaymentCreateParams>
>
type PaymentUpdateContractMatches = Assert<
  Equivalent<PaymentUpdateInput, ClientPaymentUpdateParams>
>
type SubscriptionCreateContractMatches = Assert<
  Equivalent<SubscriptionCreateInput, ClientSubscriptionCreateParams>
>
type ProductEnsureContractMatches = Assert<
  Equivalent<z.input<typeof ProductEnsureSchema>, ClientProductEnsureParams>
>
type PlanEnsureContractMatches = Assert<
  Equivalent<z.input<typeof PlanEnsureSchema>, ClientPlanEnsureParams>
>
type PriceEnsureContractMatches = Assert<
  Equivalent<z.input<typeof PriceEnsureSchema>, ClientPriceEnsureParams>
>
type CustomerEnsureContractMatches = Assert<
  Equivalent<z.input<typeof CustomerEnsureSchema>, ClientCustomerEnsureParams>
>
type SubscriptionEnsureContractMatches = Assert<
  Equivalent<
    z.input<typeof SubscriptionEnsureSchema>,
    ClientSubscriptionEnsureParams
  >
>

export type ClientContractAssertions =
  | BankAccountCreateContractMatches
  | BankAccountUpdateContractMatches
  | BankTransactionCreateContractMatches
  | BankTransactionUpdateContractMatches
  | CustomerCreateContractMatches
  | InvoiceCreateContractMatches
  | PaymentCreateContractMatches
  | PaymentModeCreateContractMatches
  | PaymentModeUpdateContractMatches
  | PaymentUpdateContractMatches
  | SubscriptionCreateContractMatches
  | ProductEnsureContractMatches
  | PlanEnsureContractMatches
  | PriceEnsureContractMatches
  | CustomerEnsureContractMatches
  | SubscriptionEnsureContractMatches
