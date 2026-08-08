# Customer management

## The two kinds of courier customer

A courier customer in the couriers app is either an `EXTERNAL` customer created by staff or a `CORE_USER` customer created through the consumer portal.

| Kind        | Created by              | Has an 876 account?                            | Identity editable in couriers? |
| ----------- | ----------------------- | ---------------------------------------------- | ------------------------------ |
| `EXTERNAL`  | Staff in manage app     | No (`CourierCustomerProfile.userId` is `null`) | Yes                            |
| `CORE_USER` | Consumer portal sign-up | Yes (`CourierCustomerProfile.userId` present)  | No                             |

An `EXTERNAL` customer represents a party created manually by staff from `/[orgSlug]/customers/new`. The customer has no 876 account, so `CourierCustomerProfile.userId` is `null` in `apps/couriers/prisma/schema/customer.prisma`. Identity fields (first name, last name, company name, email, phone) live on the shared Billing registry row (Layer 2) with `customerType: 'EXTERNAL'` and are editable by staff.

A `CORE_USER` customer represents a consumer who enrolled through the courier portal. The profile links to an 876 account (`userId`). Identity fields belong to the user's 876 account (Layer 1) and are read-only in couriers.

## Creating a customer

Staff create a customer through `createManagedCustomer` in `apps/couriers/src/lib/manage/customers.ts`. The creation process performs the following ordered steps:

1. **Profile ID generation**: Generates a profile ID (`profileId`) prior to any remote calls so it can serve as an idempotency anchor.
2. **Mailbox allocation**: Allocates a mailbox number via `service.mailboxes.allocate`.
3. **Registry customer creation**: Creates an `EXTERNAL` customer in the shared Billing registry via `createExternalCustomer` in `apps/couriers/src/lib/finance/customers.ts`. The call specifies `customerType: 'EXTERNAL'`, `sourceExternalReference: 'couriers:profile:<profileId>'`, and `idempotencyKey: 'couriers:profile:<profileId>'`.
4. **Courier profile creation**: Creates the `CourierCustomerProfile` and primary mailbox in the couriers datastore via `service.customerProfiles.create` in `apps/couriers/src/lib/service/customer-profiles/create.ts`.

If step 4 fails after step 3 succeeds, the orphaned registry row is intentional. Retrying customer creation with the same pre-generated profile ID reuses the existing registry customer via the `couriers:profile:<profileId>` idempotency key.

## Editing a customer

Customer updates are processed by `updateManagedCustomer` in `apps/couriers/src/lib/manage/customers.ts`:

- **Identity fields**: Updating any identity field (`firstName`, `lastName`, `companyName`, `email`, `phone`) requires checking the registry customer's `customerType`. If `customerType` is not `EXTERNAL` (i.e. `CORE_USER`), the update fails with `customer/identity-locked` because account identity belongs to the user's 876 account. For `EXTERNAL` customers, identity updates are saved to the Billing registry via `updateExternalCustomer` in `apps/couriers/src/lib/finance/customers.ts`.
- **Operational fields**: Courier-operational fields (`branchId`, `status`, `trn`, `isCommercial`) are stored on `CourierCustomerProfile` and are updated via `service.customerProfiles.update` in `apps/couriers/src/lib/service/customer-profiles/update.ts` for both `EXTERNAL` and `CORE_USER` customers.

## Archiving a customer

Archiving or deleting a customer is performed by `deleteCustomer` in `apps/couriers/src/lib/service/customer-profiles/delete.ts`:

- Deletion is a soft delete: it writes `deletedAt`, `deletedBy`, and `deletionReason` on `CourierCustomerProfile` using tombstone columns defined in `apps/couriers/prisma/migrations/20260808000000_courier_customer_crud/migration.sql`.
- Every read query (such as `service.customerProfiles.list` in `apps/couriers/src/lib/service/customer-profiles/list.ts`) filters out soft-deleted profiles by requiring `deletedAt: null`.
- The shared Billing registry customer (Layer 2) is not archived or deleted when a courier profile is soft-deleted, because other 876 apps in the same organization may still have that party as their customer.

## Where each field lives

| Field           | Layer                                 | Owned by                                                       |
| --------------- | ------------------------------------- | -------------------------------------------------------------- |
| Name            | Layer 2 (Billing registry)            | Billing registry (`EXTERNAL` customer snapshot / Core account) |
| Company         | Layer 2 (Billing registry)            | Billing registry (`EXTERNAL` customer company name)            |
| Email           | Layer 2 (Billing registry)            | Billing registry (`EXTERNAL` customer email / Core account)    |
| Phone           | Layer 2 (Billing registry)            | Billing registry (`EXTERNAL` customer phone / Core account)    |
| Mailbox number  | Layer 3 (`courier_customer_profiles`) | Couriers app (`mailboxes` table)                               |
| Home branch     | Layer 3 (`courier_customer_profiles`) | Couriers app (`CourierCustomerProfile.branchId`)               |
| Status          | Layer 3 (`courier_customer_profiles`) | Couriers app (`CourierCustomerProfile.status`)                 |
| TRN             | Layer 3 (`courier_customer_profiles`) | Couriers app (`CourierCustomerProfile.trn`)                    |
| Commercial flag | Layer 3 (`courier_customer_profiles`) | Couriers app (`CourierCustomerProfile.isCommercial`)           |
