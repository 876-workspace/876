# Implementation Plan: Billing And Invoice List Detail Split

**Run Identifier:** `2026-09-02-billing-and-invoice-list-detail-split`  
**Date:** 2026-09-02  
**Status:** COMPLETED ✅  

## Overview
Conversion of all remaining entity views in `@876/billing-app` (estimates, vendors, subscription catalog plans, addons, coupons, credit notes, adjustments) and `@876/invoice` (quotes, invoices, payments, sales-receipts) into standardized list/detail split views using `ResourceSplitView`, `ResourceListPane`, `ResourceDetailPane`, and consistent URL-driven selection patterns (`?selected=<id>`).

## Scope & Target Apps
- `apps/billing`: Estimates, Vendors, Subscription catalog items (plans, addons, coupons, credit notes, adjustments)
- `apps/invoice`: Quotes, Invoices, Payments, Sales Receipts

## Dispatched Briefs
| Delegate / Tool | Brief File |
| --- | --- |
| `agy` | [`2026-09-02-billing-catalog-list-detail-split.md`](./briefs/agy/2026-09-02-billing-catalog-list-detail-split.md) |
| `agy` | [`2026-09-02-billing-list-detail-split.md`](./briefs/agy/2026-09-02-billing-list-detail-split.md) |
| `codex` | [`2026-09-02-billing-remaining-list-detail-split.md`](./briefs/codex/2026-09-02-billing-remaining-list-detail-split.md) |
| `codex` | [`2026-09-02-invoice-remaining-list-detail-split.md`](./briefs/codex/2026-09-02-invoice-remaining-list-detail-split.md) |

## Execution Reports
| Delegate / Tool | Report File |
| --- | --- |
| `agy` | [`2026-09-02-billing-catalog-list-detail-split.md`](./reports/agy/2026-09-02-billing-catalog-list-detail-split.md) |
| `agy` | [`2026-09-02-billing-list-detail-split.md`](./reports/agy/2026-09-02-billing-list-detail-split.md) |
| `codex` | [`2026-09-02-remaining-list-detail-split.md`](./reports/codex/2026-09-02-remaining-list-detail-split.md) |

## Task Checklist
- [x] Briefed & Executed `2026-09-02-billing-catalog-list-detail-split.md` (via `agy`)
- [x] Briefed & Executed `2026-09-02-billing-list-detail-split.md` (via `agy`)
- [x] Briefed & Executed `2026-09-02-billing-remaining-list-detail-split.md` (via `codex`)
- [x] Briefed & Executed `2026-09-02-invoice-remaining-list-detail-split.md` (via `codex`)
- [x] Received & Verified report `2026-09-02-billing-catalog-list-detail-split.md` (from `agy`)
- [x] Received & Verified report `2026-09-02-billing-list-detail-split.md` (from `agy`)
- [x] Received & Verified report `2026-09-02-remaining-list-detail-split.md` (from `codex`)

## Multi-Session Continuity & Handoff
All context, delegated briefs, and verification reports for this implementation run are preserved in this directory. Any agent resuming or reviewing this feature can inspect the subagent artifacts directly.
