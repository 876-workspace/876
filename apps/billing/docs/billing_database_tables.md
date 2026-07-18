# 876 Billing Database Tables

This document outlines the database tables (Prisma models) used in the `@876/billing-app` (Billing SaaS), grouped by their domain and schema file.

## Core & Tenancy

- **Tenant** (`tenant.prisma`): Represents an isolated tenant (organization/business) using the billing engine.
- **Language** (`language.prisma`): Supported languages for localization.

## Access Control

- **Role** (`access.prisma`): User roles for RBAC.
- **Member** (`access.prisma`): Users belonging to a specific tenant.

## Customer & Contacts

- **Customer** (`customer.prisma`): Businesses or individuals being billed.
- **Contact** (`customer.prisma`): Individual contacts associated with a customer.
- **Address** (`customer.prisma`): Physical or billing addresses for customers.
- **Vendor** (`vendor.prisma`): Suppliers or vendors.

## Product Catalog

- **Product** (`product.prisma`): High-level products or services offered.
- **Plan** (`plan.prisma`): Subscription plans grouping various products/features.
- **Price** (`price.prisma`): Pricing definitions for products or plans.
- **PriceTier** (`price.prisma`): Tiered pricing structures (e.g., volume-based pricing).
- **Item** (`item.prisma`): Specific line items or SKUs that can be billed.

## Subscriptions

- **Subscription** (`subscription.prisma`): Recurring billing agreements with customers.
- **SubscriptionItem** (`subscription.prisma`): Specific items or features included in a subscription.
- **SubscriptionEvent** (`subscription.prisma`): Lifecycle events and audits for subscriptions (e.g., started, paused, canceled).
- **SubscriptionBillingRun** (`billing-run.prisma`): Records of automated billing runs for subscriptions.

## Billing & Invoicing

- **Invoice** (`invoice.prisma`): Generated invoices for customers.
- **InvoiceLine** (`invoice.prisma`): Line items within an invoice.
- **InvoicePreference** (`invoice-preference.prisma`): Workspace invoice defaults and late-fee policy.
- **LateFeeAssessment** (`invoice-preference.prisma`): Immutable, idempotent evidence linking an overdue source invoice to its generated late-fee invoice.
- **Estimate** (`estimate.prisma`): Price estimates provided to customers before invoicing.
- **EstimateLine** (`estimate.prisma`): Line items within an estimate.
- **Quote** (`quote.prisma`): Formal quotes provided to customers.
- **QuoteLine** (`quote.prisma`): Line items within a quote.
- **CreditNote** (`credit-note.prisma`): Credits issued to customers to reduce their balance.
- **CreditNoteLine** (`credit-note.prisma`): Line items within a credit note.
- **CreditNoteAllocation** (`credit-note.prisma`): Tracks how a credit note is applied to specific invoices.
- **DocumentSequence** (`document-sequence.prisma`): Sequential numbering generation for invoices, estimates, etc.

## Payments & Banking

- **Payment** (`payment.prisma`): Received payments from customers.
- **PaymentAllocation** (`payment.prisma`): Tracks how a payment is applied across one or more invoices.
- **Refund** (`refund.prisma`): Refunds issued to customers.
- **PaymentMode** (`payment-mode.prisma`): Methods of payment (e.g., Credit Card, ACH, Cash).
- **PaymentTerm** (`payment-term.prisma`): Agreed terms for payment (e.g., Net 30, Due on Receipt).
- **BankAccount** (`bank-account.prisma`): Bank accounts linked for receiving or sending payments.
- **BankTransaction** (`bank-account.prisma`): Reconciled or imported bank transactions.

## Payment Providers

- **PaymentProvider** (`payment-provider.prisma`): Supported payment gateways (e.g., Stripe, PayPal).
- **PaymentProviderConnection** (`payment-provider.prisma`): Tenant-specific configurations/credentials for payment providers.
- **PaymentAttempt** (`payment-provider.prisma`): Audit logs of attempts to charge a payment method.
- **PaymentProviderEvent** (`payment-provider.prisma`): Webhooks or events received from payment providers.

## Discounts & Promotions

- **Coupon** (`discount.prisma`): Reusable discount templates.
- **PromotionCode** (`discount.prisma`): Unique codes that customers can apply to redeem a coupon.
- **SubscriptionDiscount** (`discount.prisma`): Discounts applied specifically to recurring subscriptions.

## Tax & Currency

- **TaxAuthority** (`tax.prisma`): Government bodies or jurisdictions for taxation.
- **TaxRate** (`tax.prisma`): Defined tax percentages for various products or regions.
- **Currency** (`currency.prisma`): Global list of supported currencies.
- **TenantCurrency** (`currency.prisma`): Currencies enabled or used by a specific tenant.

## Accounting & Sales

- **CustomerLedgerEntry** (`ledger-entry.prisma`): Financial ledger entries tracking debits and credits for customer accounts.
- **Salesperson** (`salesperson.prisma`): Sales representatives associated with customers or deals.
