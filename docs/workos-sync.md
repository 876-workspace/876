# WorkOS ⇄ 876 identity sync

How the identity provider and the 876 database are kept in step, and how to
repair them when they are not.

## The invariant

WorkOS is the **credential store**; the 876 database (`apps/api`) is the
**platform record**. Every WorkOS user, organization, and organization
membership should have exactly one local counterpart, and vice versa.

Drift breaks the platform in a specific, quiet way: a WorkOS user with no 876
row can still authenticate, but is invisible in Console and has no role,
permissions, features, or memberships. It shows up as "Console and WorkOS
disagree about who exists."

The linkage is by opaque provider id, stored on the local row:

| Local table     | Column                   | WorkOS record |
| --------------- | ------------------------ | ------------- |
| `users`         | `workos_user_id`         | `user_…`      |
| `organizations` | `workos_organization_id` | `org_…`       |
| `memberships`   | `workos_membership_id`   | `om_…`        |

An organization additionally carries its local id in the WorkOS org's
`external_id`, which is what lets a broken link be repaired rather than guessed.
(Organizations created by older code stamped the **slug** there instead; the
reconciler matches on either.)

## Where the sync happens

Every route that writes one side writes the other. The provider calls live in
`apps/api/services/identity_sync.py` — nothing else should call
`provider.delete_*` directly.

| Operation                              | Local write     | Provider call                  |
| -------------------------------------- | --------------- | ------------------------------ |
| `DELETE /users/{id}`                   | tombstone       | delete the WorkOS user         |
| `DELETE /users/{id}/purge`             | hard delete     | delete the WorkOS user         |
| `DELETE /organizations/{id}`           | tombstone       | delete the WorkOS organization |
| `DELETE /organizations/{id}/purge`     | hard delete     | delete the WorkOS organization |
| `POST /memberships`                    | create          | create the WorkOS membership   |
| `POST /organizations/{id}/memberships` | create          | create the WorkOS membership   |
| invite acceptance                      | create/activate | create the WorkOS membership   |
| `DELETE /memberships/{id}`             | delete          | delete the WorkOS membership   |

### Why deleting a user also deletes it in WorkOS

WorkOS has no "disabled" state. A tombstoned 876 account whose WorkOS user
survives can still authenticate, so deleting the provider user is what actually
revokes the credentials. The local tombstone remains the record of the account.

### Ordering

**Deletes:** local write → flush → provider call → commit. A provider failure
raises and rolls the local write back, so neither side changed. The reverse
order can delete at WorkOS and then fail to commit, leaving credentials
destroyed for a user who still looks active.

**Creates:** provider call → local write. A provider failure aborts before
anything local exists, rather than leaving a local-only row.

Both orders leave the same narrow window — a provider call that succeeds while
the commit fails. That is what the reconciler exists to catch.

### Registration deliberately does _not_ compensate the user

`AuthService.register` / `register_business` create the WorkOS user first. If
the local work then fails, the WorkOS user is **left in place**. This is
intentional: `_register_or_adopt_workos_user` re-adopts an existing provider
account on the next attempt (after proving the password), so a retry is
self-healing — whereas deleting the account would destroy working credentials
over a transient database error. `register_business` _does_ compensate the
WorkOS **organization**, because a half-created org has no such recovery path.

An orphan from an abandoned registration is cleaned up by the reconciler.

### Tombstoned accounts cannot resurrect

`UserRepository.ensure_from_workos` refuses a session for an account whose
local row is soft-deleted (`auth/account-deleted`, 403), matching on the WorkOS
id **or** the email. Without it, a deleted user holding valid provider
credentials falls through to the create branch and collides with its own
tombstone on the `users.email` unique index — a 500 rather than a refusal.

## Reconciling

`apps/api/scripts/reconcile_workos.py` compares both directories and reports
every discrepancy. It writes nothing without an explicit flag.

```bash
cd apps/api
.venv/bin/python scripts/reconcile_workos.py            # report only
```

| Flag               | Effect                                                              |
| ------------------ | ------------------------------------------------------------------- |
| `--relink`         | Point an unlinked local row at the WorkOS record it already matches |
| `--adopt-users`    | Create local rows for WorkOS users that have none                   |
| `--adopt-orgs`     | Create local rows (with provisioned roles) for WorkOS-only orgs     |
| `--delete-orphans` | Delete WorkOS records with no local counterpart — needs `--yes`     |

Repairs are independent; run only the ones the report calls for. Local repairs
commit as one transaction before any provider deletion, so a failure there
leaves WorkOS untouched and the report still accurate.

### Reading the report

- **linkable** — the two records are already the same thing and only the id
  column is missing. Always safe; run `--relink` first, since it also lets
  memberships under that org match.
- **In WorkOS, not in 876** — adopt it (the account should exist) or delete it
  (it is a leftover). Users whose email is already taken by a live local account
  are flagged and skipped by `--adopt-users`; those need a manual decision.
- **In 876, not in WorkOS** — no automatic repair. A local row pointing at a
  provider record that no longer exists means the person cannot sign in; decide
  per case whether to delete the local row or re-invite them.
- **not created by 876** — informational, never drift. A WorkOS organization
  with no `external_id` and no `metadata.slug` was not created by 876. The
  environment's default test organization is always in this bucket, and WorkOS
  refuses to delete it.

### When to run it

After any incident that could have interrupted a write mid-flight, and any time
Console's user or organization list looks wrong. It is read-only by default, so
running it to check costs nothing.

## Ground already covered

Drift found and repaired on 2026-07-31 (development environment): five WorkOS
users and six WorkOS organizations with no 876 counterpart, all leftovers from
Console deletes and abandoned business registrations performed before the
lifecycle routes called the provider. The Efesto organization and its owner
membership were relinked; the rest were deleted at WorkOS.
