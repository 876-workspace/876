# 876 Storage & Drive Architecture

Read this before storing, uploading, referencing, serving, or listing **any
file** in any 876 app — organization logos, avatars, payment evidence, pre-alert
documents, chat media, contracts, exports, generated invoices. It fixes the
naming, the placement, and the classification model that decides whether a file
can ever surface in a browsable UI. Companion to
`.claude/rules/platform-services.md` (three-bucket placement),
`.claude/rules/sdk-conventions.md` (client surface), and
`.claude/rules/deletions.md` (tombstones).

## Fixed terminology

| Term              | Meaning                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **876 Storage**   | The backend platform: upload authorization, file metadata, ownership, permissions, retention, R2 integration, processing.   |
| **876 Drive**     | The end-user interface for browsing, uploading, organizing, and managing files. **Not yet built.** Deliberately deferred.   |
| **File**          | A metadata record with a stable internal ID (`file_…`). The canonical identity of a stored object.                          |
| **Object**        | The bytes in Cloudflare R2, addressed by a server-generated object key. Never referenced directly by application code.      |
| **Upload route**  | A named, server-declared upload policy (`organization.primaryLogo`) fixing MIME types, size, ownership, category, audience. |
| **Resource link** | The typed association between a file and a business record (`appId` + `resourceType` + `resourceId` + `relation`).          |

Never call a file record "an upload", never call an object key "the URL", and
never call 876 Storage "876 Drive" — Drive is one consumer of Storage, not a
synonym for it.

## Placement: 876 Storage is a shared platform service

Files span every surface — created in Couriers, attached in Billing, overseen in
Console, sent through a future 876 Chat. By decision step #3 of
`platform-services.md` that makes Storage a **shared platform service with its
own bounded context and database** — not the identity API (files are not
identity) and not any single app's datastore (files are not local to one app).

Consequences, all non-negotiable:

- File metadata lives in the Storage service's own database.
- Storage references core entities (`user_…`, `org_…`, `app_…`) as **opaque ID
  columns with no cross-DB foreign key**, resolving details through `$876`.
- Applications reference files by **opaque `fileId`**, never by object key,
  bucket name, or provider URL. `organizations.logo_file_id` is the canonical
  link; a rendered URL is a cache, never the source of truth.
- R2 credentials are server-only, held by the Storage service alone. No other
  app, and no browser, ever holds them.

## Classification: the model that decides who sees a file, and where

Every file carries **server-assigned** classifications, fixed by the upload route
at creation time. **None are ever supplied by the client, and none are editable
by an end user.**

Two questions are being answered, and they are **different questions**. Keeping
them in separate fields is the whole design — collapsing them into one "visible"
flag is how receipts end up in file pickers.

1. **`category`** — _how is this file managed, and can it be browsed?_
2. **`audience`** — _who is allowed to read the bytes?_

A term note, because it is easy to get wrong: we deliberately do **not** use the
word "visibility" for either. It reads as "who can see it" but was originally
used here for "can it be listed", and that ambiguity is exactly the bug. Say
`category` or `audience`; never "visibility".

### Axis 1 — `category`: how the file is managed, and whether Drive lists it

| Value        | Meaning                                                                                                              | Example                                                      |
| ------------ | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `library`    | The user deliberately filed this. Browsable, searchable, movable, renamable, user-deletable in Drive.                | A document a user uploads to their own files.                |
| `attachment` | An app created it as part of a business record. Reachable **only** through its resource link. Never listed by Drive. | Payment receipt, invoice PDF, chat media, org logo.          |
| `system`     | Platform internals, not user-addressable at all.                                                                     | Thumbnails, derivatives, export bundles, generated archives. |

**Browsability is derived from `category`, not stored separately.** Drive's
browse and search endpoints filter `category = 'library'` **in the repository
query**. An `attachment` is not hidden from the response — it is never in the
result set. There is no client-side filtering, no "hidden" flag the UI honors,
and no endpoint that returns mixed categories and expects the caller to filter.
This is the single rule that keeps a payment receipt out of a file picker.

**`attachment` is the default.** A route must _explicitly_ opt in to `library`,
so the failure mode is "less discoverable than intended", never "a receipt leaked
into a browsable list."

### Axis 2 — `audience`: who may read the bytes

| Value          | Who can read                                                                                                | Bytes served as               | Example                              |
| -------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------ |
| `private`      | The owning user alone.                                                                                      | short-lived signed URL        | A user's personal document, ID scan. |
| `organization` | Members of the owning organization, subject to the owning app's permission check.                           | short-lived signed URL        | An invoice PDF, a vendor contract.   |
| `app`          | Delegated: the **owning app arbitrates**. Storage discloses only when that app asserts an authorized actor. | short-lived signed URL        | Chat media, payment evidence.        |
| `public`       | Anyone with the URL.                                                                                        | stable CDN URL, public bucket | Organization logo, app icon, avatar. |

`app` is the value for "limited to only the chat app". Storage cannot itself know
whether a given user is a participant in a given conversation — that is the
app's domain knowledge — so Storage refuses to disclose and requires 876 Chat to
assert authorization for a named actor. The same applies to payment evidence,
where Billing decides who may view a receipt.

**Delivery is derived from `audience`, not a separate field.** `public` means the
public assets bucket and a stable CDN URL; every other audience means the private
bucket and a per-request signed URL. There is deliberately **no way to express
"private audience, public delivery"** — that combination was a footgun, so the
model makes it unrepresentable rather than merely discouraged.

`private` is the default. Never widen a route to `public` because a URL is easier
to render in an `<img>` — if it needs a URL, it gets a signed one with a short TTL.

### The two axes are independent

|                | `library`                      | `attachment`                       |
| -------------- | ------------------------------ | ---------------------------------- |
| `private`      | a user's own filed document    | a user's ID scan on an application |
| `organization` | a shared org document in Drive | an invoice PDF, a vendor contract  |
| `app`          | (rare)                         | chat media, payment evidence       |
| `public`       | a deliberately published asset | organization logo, app icon        |

Read the org logo row carefully: it is `attachment` + `public` — world-readable,
but **not** a browsable library file a user could rename or delete out from under
the org's branding.

### Axis 3 — `sourceAppId` + `purpose`: what created it, and why

`purpose` is the upload route's stable key (`organization_logo`,
`payment_receipt`, `chat_attachment`, `invoice_document`). It drives retention
and, much later, Drive smart collections. A smart collection is an **explicit
query the owning app opts into**, never a relaxation of the `category`
predicate: surfacing logos in a future "Branding" collection does not make them
`library`, does not make them user-deletable, and does not put them in the
browse tree.

### Resource links: what the file is attached to

An `attachment` is meaningful only in relation to the record it hangs off, so
every one carries a typed link:

```
{ fileId, appId, resourceType, resourceId, relation }
```

`payment → receipt`, `invoice → document`, `organization → primary_logo`,
`conversation → media`. This is how an app retrieves "the files for this
invoice" without ever enumerating storage, and it is the only supported way to
reach an `attachment`. A file with no resource link and `category = 'attachment'`
is an orphan for the cleanup job, not a browsable file.

### Why classification, not an ACL

"May this appear in Drive, and who may read it" is a property of **why the file
exists**, decided once by the route at upload time — not a permission a user can
be granted, not a folder they can move a file out of, and not an ACL evaluated at
read time. Folders, when they arrive, are metadata only and **cannot promote an
`attachment` into the library** or widen its audience. An ACL model would let
every new app accidentally widen exposure; route-fixed classification means a new
app cannot, even by mistake.

## Object keys

Keys are **generated by the server**, immutable, and carry no authorization
meaning:

```
organizations/{organizationId}/branding/{fileId}/{versionId}
```

Never include a raw filename, an organization name, an email, a user-controlled
path segment, or anything a client supplies. A client never chooses a key, a
bucket, an owner, a category, or an audience — it names an **upload route**, and
the server derives all of the above from that route plus the authenticated
caller.

## Upload flow (the only sanctioned shape)

1. Client asks the owning app to start an upload for a named route.
2. The app authorizes the actor against the target resource and calls Storage.
3. Storage validates the route policy, creates a `pending` file record, and
   returns a **short-lived signed upload URL** bound to the exact server-chosen key.
4. The browser uploads the bytes **directly to R2**.
5. The client calls completion. **Storage independently verifies the object**
   (existence, size, content type) via HEAD — the browser's claim that the
   upload succeeded is never trusted.
6. Storage marks the file `ready`; the app attaches the `fileId` to its record.

### Size enforcement is server-side, because R2 gives us no alternative

**R2 does not support presigned POST policies** — only presigned `GET`, `HEAD`,
`PUT`, and `DELETE`. The S3 `content-length-range` condition, which is how one
normally caps upload size at the edge, is therefore **unavailable**. This is a
platform constraint, not an oversight, and it dictates two mandatory controls:

1. **Sign the contract into the URL.** `Content-Type` and `Content-Length` are
   included as signed headers on the presigned `PUT`, using the size and type the
   client declared when it opened the session. A client that sends different
   values gets `SignatureDoesNotMatch` from R2 and the upload never lands. Reject
   the declared size against the route's maximum _before_ signing.
2. **Verify after the fact, and clean up.** On completion, HEAD the object and
   compare actual `ContentLength` and `ContentType` against the route policy. On
   any mismatch: **delete the object**, mark the file `failed`, and return an
   error. Never mark a file `ready` on an unverified object.

Signed expiry is short — minutes, not the 7-day maximum R2 permits. Treat a
long-lived upload URL as a credential leak.

Completion must be **idempotent**: a repeated call returns the existing result
rather than creating a second record. A replacement must not delete the previous
file until the new one is verified `ready`.

## Do not

- Do not let a browser hold R2 credentials, or any long-lived storage credential.
- Do not let a client supply the object key, bucket, owner ID, category,
  audience, or purpose.
- Do not use the word "visibility" for either axis — say `category` (how it is
  managed and whether Drive lists it) or `audience` (who may read it).
- Do not add a separate "delivery" or "public" flag; delivery is derived from
  `audience`, so that "private audience, public delivery" stays unrepresentable.
- Do not store a provider URL as a file's identity — always the `fileId`.
- Do not add a cross-database foreign key from an app to the Storage database.
- Do not mark a file `ready` on the client's word; verify the object server-side.
- Do not add an endpoint that returns files of mixed `category` and expects the
  caller to filter.
- Do not disclose an `audience: app` file without the owning app asserting an
  authorized actor — Storage does not know that app's domain rules.
- Do not accept SVG until a sanitization step exists — it is an active-content
  format.
- Do not build the Drive explorer, folders, tags, sharing, OCR, or smart
  collections before contextual uploads are stable in production.

## Current implementation boundary

Built: R2 provider adapter, file metadata, upload sessions, the
`organization.primaryLogo` route, and Couriers organization-logo upload.

Not built, and not to be built without an explicit decision: Drive explorer,
folders, tags, versions beyond replacement, sharing links, OCR, malware
scanning, multipart uploads, quotas, and the UploadThing migration.
