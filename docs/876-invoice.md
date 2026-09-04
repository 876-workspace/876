# 876 Invoice — Architecture, Roadmap & Zoho Invoice Parity

- **App Workspace:** `@876/invoice-app` (`apps/invoice`, port 3006)
- **Data Service:** `@876/billing-api` (`apps/billing-api`, port 4004)
- **SDK Clients:** `@876/invoice` (`packages/invoice`), `@876/billing` (`packages/billing`)
- **Tracking Project:** `INV` (`876 Invoice`) in 876 Projects

---

## 1. System Overview & Monorepo Placement

876 Invoice provides invoicing, quotes/estimates, retainer deposits, project time billing, and payment processing for SMBs and freelancers.

In accordance with 876 monorepo boundaries ([`AGENTS.md`](file:///root/projects/876/AGENTS.md) and [`023-876-crm.md`](file:///root/projects/876/docs/architecture/023-876-crm.md)):

- **Data Service Ownership:** The financial data plane lives exclusively in [`apps/billing-api`](file:///root/projects/876/apps/billing-api). No Next.js app accesses the billing database directly.
- **Client Access:** [`apps/invoice`](file:///root/projects/876/apps/invoice) communicates with the backend via the typed `@876/invoice` and `@876/billing` integration packages.
- **Customer Identity:** Customer records originate in `@876/billing-api` and cross-reference core 876 identity by opaque ID.

```
┌────────────────────────────────────────────────────────┐
│   apps/invoice (Port 3006) / apps/console (Port 3002)   │
│   Next.js 16 Presentation Layer & Split-View Desks     │
└──────────────────────────┬─────────────────────────────┘
                           │ @876/invoice + @876/billing
                           ▼
┌────────────────────────────────────────────────────────┐
│   apps/billing-api (Port 4004)                          │
│   Express 5 + Prisma 7 Financial Data Engine           │
│   Invoices, Quotes, Retainers, Expenses, Payments      │
└────────────────────────────────────────────────────────┘
```

---

## 2. Zoho Invoice API v3 Comprehensive Comparison Matrix

| Zoho Invoice API Module | Zoho Endpoint                   | 876 Invoice Implemented State                | 876 Target Feature & Issue                                                   |
| :---------------------- | :------------------------------ | :------------------------------------------- | :--------------------------------------------------------------------------- |
| **Contacts**            | `/contacts`                     | Implemented in `billing-api` + UI (`INV-24`) | Full customer profile & balance ledger                                       |
| **Contact Persons**     | `/contacts/{id}/contactpersons` | Single customer contact model                | **`INV-46`**: Multi-contact hierarchy (AP, Billing, Tech)                    |
| **Invoices**            | `/invoices`                     | Implemented in `billing-api` + UI (`INV-26`) | Split-view invoice desk, status lifecycle                                    |
| **Estimates / Quotes**  | `/estimates`                    | Data model in billing-api (`INV-15`)         | **`INV-16`**, **`INV-17`**: Quotes split-view & 1-click conversion           |
| **Retainer Invoices**   | `/retainerinvoices`             | Planned                                      | **`INV-41`**: Upfront deposits, ledger & invoice drawdown                    |
| **Recurring Invoices**  | `/recurringinvoices`            | Subscription profiles in billing-api         | **`INV-5`**: Recurring invoice automation & auto-charge                      |
| **Customer Payments**   | `/customerpayments`             | Implemented in `billing-api` (`INV-27`)      | **`INV-50`**: Multi-invoice payment allocation & advance credits             |
| **Credit Notes**        | `/creditnotes`                  | Data model in billing-api (`INV-19`)         | **`INV-19`**, **`INV-38`**: Credit notes, invoice application & refunds      |
| **Items**               | `/items`                        | Implemented in `billing-api` (`INV-25`)      | Item catalog with unit prices and tax rates                                  |
| **Price Lists**         | `/pricelists`                   | Default price book only                      | **`INV-44`**: Named price lists, markups/markdowns, volume tiers             |
| **Expenses**            | `/expenses`                     | Schema shell in billing-api (`INV-21`)       | **`INV-7`**, **`INV-21`**, **`INV-36`**: Billable expenses & receipt uploads |
| **Recurring Expenses**  | `/recurringexpenses`            | Planned                                      | Recurring operational overhead tracking                                      |
| **Expense Category**    | `/expensecategories`            | Basic category model                         | Materialized tax-deductible expense taxonomy                                 |
| **Projects**            | `/projects`                     | Planned                                      | **`INV-42`**: 4 billing modes (Hourly, Task, Staff, Fixed)                   |
| **Time Entries**        | `/projects/{id}/time-entries`   | Planned                                      | **`INV-43`**: In-app stopwatch timer & project invoice wizard                |
| **Delivery Challans**   | `/deliverychallans`             | Planned                                      | **`INV-45`**: Goods delivery challan & packing slip conversion               |
| **Taxes**               | `/settings/taxes`               | Tax rate repository in billing-api           | **`INV-47`**: Tax inclusive/exclusive, compound taxes & TDS                  |
| **Currency**            | `/settings/currencies`          | Base currency support                        | **`INV-39`**: Multi-currency exchange rate overrides                         |
| **Customer Portal**     | `/portal`                       | In review                                    | **`INV-10`**, **`INV-51`**, **`INV-52`**: Signatures, statement & Autopay    |
| **Late Fees**           | `/settings/latefees`            | Schema migration ready                       | **`INV-48`**: Automated late fee surcharges & grace periods                  |
| **Write-Offs**          | `/invoices/{id}/writeoff`       | Planned                                      | **`INV-49`**: Uncollectible bad debt write-off & recovery                    |
| **Reports**             | `/reports`                      | Aggregation endpoints in billing-api         | **`INV-53`**, **`INV-54`**: AR Ageing, Sales by Item/Customer                |

---

## 3. Master Issues Catalog (`INV-1` to `INV-55`)

All issues are tracked in **876 Projects** under project [`INV`](file:///root/projects/876/apps/projects-api) (`prj_f7d4abf75276414089d0deb200206b16`):

### Completed Core Baseline (`done`)

- **[INV-24](file:///root/projects/876/apps/invoice): Customer management & creation form in 876 Invoice** _(Done, High)_
- **[INV-25](file:///root/projects/876/apps/invoice): Catalog items management & creation form in 876 Invoice** _(Done, High)_
- **[INV-26](file:///root/projects/876/apps/invoice): Invoices list and detail split-view in 876 Invoice** _(Done, High)_
- **[INV-27](file:///root/projects/876/apps/invoice): Payments received list and detail view in 876 Invoice** _(Done, Medium)_
- **[INV-28](file:///root/projects/876/apps/invoice): Member permissions and app access in 876 Invoice** _(Done, High)_
- **[INV-29](file:///root/projects/876/apps/invoice): Organization authentication and finance connection in 876 Invoice** _(Done, High)_

---

### Core Sales Lifecycle & Immediate Fixes (`todo` / `in-progress`)

- **`INV-1`**: Expenses page is an unbacked shell and its Add button 404s _(Todo, Urgent)_
- **`INV-2`**: Time tracking page is an unbacked shell and its Add button 404s _(Todo, Urgent)_
- **`INV-3`**: Quotes and Sales Receipts list pages return null _(Todo, High)_
- **`INV-13`**: Audit the Invoice navigation against what actually resolves _(Todo, High)_
- **`INV-14`**: New Invoice creation form (`/invoices/new`) in apps/invoice _(Todo, Urgent)_
- **`INV-15`**: Expose Quotes, Estimates, and Credit Notes on the Billing integration client & getInvoice() _(Todo, Urgent)_
- **`INV-16`**: Implement Quotes list and detail split view in apps/invoice _(Todo, High)_
- **`INV-17`**: Quote-to-Invoice 1-click conversion workflow _(Todo, High)_
- **`INV-18`**: Record Payment workflow directly from Invoice detail _(Todo, High)_
- **`INV-21`**: Expense data model and CRUD in billing-api _(Todo, Urgent)_
- **`INV-30`**: Customer import wizard in 876 Invoice _(Todo, Medium)_
- **`INV-32`**: Document sequence and auto-numbering configuration _(Todo, High)_
- **`INV-35`**: Automated payment receipts and settlement notifications _(Todo, High)_
- **`INV-36`**: Expense receipt file attachments via 876 Storage _(Todo, High)_

---

### Retainer Invoices, Projects & Time Billing (`m:inv-retainer`, `m:inv-projects-time`)

- **`INV-41`: [Retainer Invoices] Retainer Invoice Creation, Advance Balance Ledger & Drawdown** _(Backlog, High, 8 pts)_
  - Retainer Invoice document model (`RET-0001`), unapplied customer deposit ledger, drawdown onto final unpaid invoices, and unused balance refunds.
- **`INV-42`: [Projects & Time Tracking] Multi-Method Project Billing (Hourly, Task, Staff, Fixed Cost)** _(Backlog, High, 8 pts)_
  - Project billing engine supporting 4 billing modes, task hourly rates, hour budgets, and user/staff billing rates.
- **`INV-43`: [Projects & Time Tracking] In-App Stopwatch Timer & Project Invoicing Wizard** _(Backlog, High, 8 pts)_
  - Live stopwatch timer widget, plus project invoicing wizard converting unbilled time entries and expenses into invoice line items.
- **`INV-6`**: Billable projects and timesheets in the finance plane _(Backlog, Medium)_
- **`INV-7`**: Billable expenses converted onto an invoice _(Backlog, High)_
- **`INV-8`**: Mileage and travel expense tracking _(Backlog, Low)_

---

### Price Lists, Compliance, Taxes & Bad Debt (`m:inv-price-lists`, `m:inv-compliance-tax`)

- **`INV-44`: [Price Lists] Custom Price Lists, Tiered Volume Pricing & Customer Assignment** _(Backlog, Medium, 5 pts)_
  - Named price lists with percentage markup/markdown, item-level overrides, and customer/currency assignment.
- **`INV-45`: [Delivery Challans] Goods Delivery Challans & Packing Slip Conversion** _(Backlog, Low, 5 pts)_
  - Packing slips and delivery challans tracking dispatch, delivered, and return statuses, with 1-click conversion to sales invoices.
- **`INV-46`: [Contacts] Multi-Contact Persons Hierarchy with Role-Based Email Dispatch** _(Backlog, High, 5 pts)_
  - Multi-contact hierarchy per customer (Billing Contact, Accounts Payable, Tech Contact) with multi-recipient (To/CC) email dispatch.
- **`INV-47`: [Taxes & Compliance] Tax Inclusive/Exclusive Pricing, Compound Taxes & TDS/Withholding** _(Backlog, High, 5 pts)_
  - Tax-inclusive line item calculations, compound taxes (tax on tax), and TDS withholding deductions recorded upon payment.
- **`INV-48`: [Late Fees] Automated Overdue Late Fee Surcharges & Grace Period Calculations** _(Backlog, Medium, 5 pts)_
  - Automatic overdue late fees (flat or percentage) with configurable grace periods and automated invoice adjustments.
- **`INV-49`: [Bad Debt] Uncollectible Invoice Write-Off & Recovery Workflow** _(Backlog, Low, 3 pts)_
  - Mark uncollectible invoices as Written Off with audit reasons, adjust balance statements, and allow write-off reversal if settled.
- **`INV-50`: [Payments] Multi-Invoice Payment Allocation & Customer Excess Advance Holding** _(Backlog, High, 5 pts)_
  - Allocate single payment across multiple invoices; surplus payments held automatically as customer advance credit.
- **`INV-19`**: Implement Credit Notes in 876 Invoice _(Backlog, Medium)_
- **`INV-20`**: Sales Receipts for immediate cash / POS transactions _(Backlog, Medium)_
- **`INV-31`**: Line-item and document discounts on Invoices and Quotes _(Backlog, Medium)_
- **`INV-37`**: Customer credit limits and overdue balance warnings _(Backlog, Low)_
- **`INV-38`**: Customer refund disbursement workflow _(Backlog, Medium)_
- **`INV-39`**: Multi-currency exchange rate overrides on sales documents _(Backlog, Medium)_

---

### Customer Portal, Autopay & Reporting (`m:inv-portal-advanced`)

- **`INV-51`: [Customer Portal] Digital Signature Capture & 1-Click Estimate Acceptance** _(Backlog, High, 5 pts)_
  - Interactive portal estimate viewer with drawn/typed signature capture and 1-click conversion to invoice.
- **`INV-52`: [Customer Portal] Saved Payment Methods & Automated Autopay on Invoices** _(Backlog, High, 8 pts)_
  - Stripe Elements customer payment method storage and automated autopay charge on invoice due date.
- **`INV-53`: [Reports] Accounts Receivable (AR) Ageing Summary & Detail Analytics** _(Backlog, Medium, 5 pts)_
  - AR Ageing buckets (Current, 1-30, 31-60, 61-90, 90+ days) with drilldowns, CSV/PDF export, and currency conversion.
- **`INV-54`: [Reports] Sales by Customer, Sales by Item & Tax Liability Reports** _(Backlog, Medium, 5 pts)_
  - Sales by Customer, Sales by Item, and government tax liability reports for tax filing.
- **`INV-55`: [Customer Statements] Automated Monthly Statement of Accounts Email Scheduler** _(Backlog, Medium, 5 pts)_
  - Scheduled monthly statement dispatch on the 1st of each month with attached PDF statement.
- **`INV-4`**: Reports page implementation in apps/invoice _(Backlog, Medium)_
- **`INV-5`**: Recurring invoice schedules _(Backlog, High)_
- **`INV-9`**: Invoice template branding and customisation _(Backlog, Medium)_
- **`INV-10`**: Customer portal for Invoice _(Backlog, High)_
- **`INV-11`**: Automated payment reminders and customer statements _(Backlog, High)_
- **`INV-12`**: Scheduled and signed invoices _(Backlog, Low)_
- **`INV-22`**: PDF generation engine for Invoices and Quotes _(Backlog, High)_
- **`INV-23`**: Email delivery pipeline for Invoices and Quotes _(Backlog, High)_
- **`INV-33`**: Custom fields and line item metadata on sales documents _(Backlog, Medium)_
- **`INV-34`**: Batch actions on invoices (bulk email, export, status updates) _(Backlog, Medium)_
- **`INV-40`**: Audit trail and document activity timeline in 876 Invoice _(Backlog, Low)_

---

## 4. Architectural Invariants

1. **Finance Plane Boundary:** Billing database tables (`invoices`, `retainers`, `price_lists`, `time_entries`) are owned strictly by `apps/billing-api`. Next.js applications interact only through `@876/invoice` and `@876/billing`.
2. **Unified Currency & Money:** Monetary amounts are stored in integer minor units (cents). Calculations apply rounding policies defined per organization currency.
3. **Double-Entry Balance Integrity:** Every invoice creation, payment allocation, credit note, retainer drawdown, and bad debt write-off emits ledger events to maintain an immutable customer balance history.
