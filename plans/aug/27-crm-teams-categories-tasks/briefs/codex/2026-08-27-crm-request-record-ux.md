# CRM app — request record UX: assignment, tasks, reminders, note kinds, instant status

**Phase C2**, the last phase of the CRM expansion. Scope is **`apps/crm/` only**, and
within it almost entirely `src/app/(app)/requests/**`. Phases A/B/C1 are done — read them
as the contract, do not modify `apps/crm-api/`, `packages/crm/`, or `packages/client/`.

Read first and obey exactly: `.claude/rules/app-layout.md`, `.claude/rules/data-loading.md`,
`.claude/rules/navigation-performance.md`, `.claude/rules/app-structure.md`,
`.claude/rules/api-access.md`, `.claude/rules/performance-rerender.md`, and the root
`CLAUDE.md` sections on **UI Copy** (no prose under headings), **UI Design** (no green
buttons), and **Loading States & Suspense Placement**.

There are eight pieces of work. Each one is a specific complaint or request from the
product owner, so the acceptance criteria are behavioural, not cosmetic.

---

## 1. Status change must feel instant

**Complaint:** "when I click to change the request status it takes a little while before
it actually changes."

`src/app/(app)/requests/_components/quick-status-selector.tsx` currently awaits the network
round trip and only then calls `router.refresh()`, so the trigger shows the old status for
the whole request.

Rewrite it to be optimistic:

- Paint the chosen status **immediately** — keep it in local state
  (`const [optimistic, setOptimistic] = useState<RequestStatus | null>(null)`) and render
  `optimistic ?? currentStatus`.
- Fire the mutation without blocking the paint, then `startTransition(() => router.refresh())`.
- **On failure, revert** `optimistic` to `null` and `toast.error(...)`. The revert is the
  whole point — do not skip it.
- Clear `optimistic` when the server value catches up: a `useEffect` on `currentStatus`
  that clears it once `currentStatus === optimistic`. Do not leave the optimistic value
  latched forever, or a later server-side change will not show.
- **Do not disable the trigger while in flight.** Disabling it is what makes the control
  feel slow; a second click should just re-optimize.
- Prefer React's `useOptimistic` if it composes cleanly with the transition here; the
  local-state form above is an acceptable and simpler equivalent. Either way the three
  behaviours (instant paint, revert on failure, reconcile on refresh) are required.

Do the same for the assignment mutations in §2 — assigning should paint immediately too.

## 2. The Assign control becomes a real popover

**Complaint:** "I don't like how the dropdown items look, and for the assignee I'd want a
pop-up that opens with a really nice interface with the list of teams available."

In `request-header-actions.tsx`, replace the `DropdownMenuSub` "Assign to team" /
"Assign to member" submenus with a single **Assign popover**, in a new
`src/app/(app)/requests/_components/assign-popover.tsx`.

Shape:

- Trigger stays the existing outline `Assign` button, but its label reflects reality:
  the assignee's name when assigned, the team name when the request only sits in a queue,
  and "Assign" when neither. Show a small `CustomerAvatar` in the trigger when assigned.
- The panel is `@876/ui/popover` + `@876/ui/command`, ~320px wide, with a
  `@876/ui/tabs` split: **People** and **Teams**.
- A single `CommandInput` at the top filters the active tab.
- **People tab**: an "Assign to me" row pinned first (avatar + "Assign to me"), then
  "Unassigned", then every org member via the shared
  `src/features/directory/components/member-picker.tsx` row style from Phase C1 — reuse
  that component's row rendering rather than duplicating it. Current assignee carries a
  `CheckIcon`.
- **Teams tab**: "No team" first, then each active team as a row with its colour dot, name,
  a muted member count, and a `CheckIcon` on the current team.
- Selecting closes the popover and applies optimistically (§1).

**The behaviour that matters most** — mirror the API's rule in the UI so the result is
never a surprise: when the user picks a **team** and the current assignee is not a member
of that team, the API clears the assignee. Reflect that immediately in the optimistic
state, and say so in the toast: `Moved to <Team> · assignee cleared`. When the assignee is
a member, the toast is just `Moved to <Team>`. A silent clear is the failure mode here.

## 3. The "Add" dropdown

**Complaint:** "I don't like how the dropdown items look."

Keep it a dropdown but make the items substantial: each item gets an icon in a small
rounded tinted square, a label, and a muted one-line descriptor
(Note → "Log an internal update", Task → "Track a follow-up", Reminder → "Get nudged
later"). Give `DropdownMenuContent` `className="w-64"` and the items `py-2`. Remove the
lone sky-coloured chevron on the trigger — it reads as an accident next to the neutral
outline buttons; the chevron matches the other triggers.

Note / Task / Reminder now all do something real (§4), so **delete `notYet()` for those
three**. Leave it for Share / Duplicate / Merge / Print / Export.

## 4. Tasks and reminders

The routes already exist as placeholders:
`(record)/tasks/page.tsx` and `(record)/reminders/page.tsx` render `SectionPlaceholder`.
Build them.

Create `src/features/request-activity/components/`:

- `task-list.tsx` — grouped **Open** / **Done**, each row a checkbox (toggling calls
  `client.requestTasks.update(status)` optimistically), the title, a muted due date that
  turns `text-destructive` when overdue and unfinished, the assignee avatar, and a row
  `···` (Edit, separator, Delete destructive). Done rows get `line-through text-muted-foreground`.
- `task-dialog.tsx` — create/edit in a `Dialog`. Fields via `FormRow`: Title (required),
  Description, Assignee (the Phase C1 `MemberPicker`), Due date (`@876/ui/calendar` in a
  popover), Priority (`RadioGroup`, four options → actually a `Select`, per `app-layout.md`
  §10a: four or more means Select). A task is a short low-stakes record, so a dialog is
  correct here — comment why.
- `reminder-list.tsx` / `reminder-dialog.tsx` — same shape. A reminder's fields are Title,
  Note, Remind at (date **and** time), and Who (`MemberPicker`, defaulting to the current
  user). Rows group **Upcoming** / **Past**, and a scheduled reminder whose `remindAt` has
  passed renders as "Overdue".
- Reminders are **not delivered yet** — no notification pipeline exists. Do not imply they
  are. The empty state and the dialog must not promise an email or a push.

**The aside summary.** The product owner asked that active tasks and reminders surface on
the request view. Add two compact sections to
`src/app/(app)/requests/[requestId]/_components/request-aside.tsx`, **below** the existing
Details card, each rendered only when it has content:

- "Tasks" — up to three open tasks, title + due date, then "View all (N)" linking to the
  tab.
- "Reminders" — up to three upcoming reminders, title + when.

Load them in `_data.ts` as new `cache()`d loaders (`loadTasks`, `loadReminders`) taking a
primitive `requestId`, exactly like `loadNotes`. A failed read is an outage — throw, do not
`?? []`. The existing file comment explains why; keep that discipline.

## 5. Note kinds get their own look

**Requirement:** the description note reads differently from an ordinary note, emails read
differently again, and internal/private notes are visibly private.

`request-notes.tsx` currently distinguishes the opening note by a `Badge` alone. Give each
kind a real treatment via a small `noteKindStyles(kind)` helper beside the component
(the way `requestStatusConfig` already works for statuses):

| Kind | Treatment |
| --- | --- |
| `DESCRIPTION` | light blue: `border-sky-200 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/30`, header strip `bg-sky-100/60 dark:bg-sky-900/25`, a 2px `border-l-sky-400` accent, `Badge` "Description" |
| `NOTE` | **warm amber, not brown**: `border-amber-200/70 bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/20`, header `bg-amber-100/40 dark:bg-amber-900/20`, `border-l-amber-400` |
| `EMAIL` | neutral slate card plus an email header block (see below) |

**On the colour:** the product owner asked for brown and reported that a previous brown
attempt "didn't come out so good". Brown at card scale reads as dirty/muddy because it is a
desaturated orange at low lightness — it fights the neutral surface instead of tinting it.
Amber at very low opacity is the same warm family and does read well. Use amber, and leave
a short comment recording that decision so it is not re-litigated.

`EMAIL` notes render a header block above the body: **From**, **To** (and **Cc** when
present), **Subject**, each as a label/value row in `text-xs`, with an envelope icon and a
direction badge (Inbound / Outbound). The body renders as-is, `whitespace-pre-wrap`.
These fields are all nullable — render only the rows that have values, and never crash on a
note whose email fields are empty.

**Private vs public.** `internal: true` is private/internal; `internal: false` is
customer-visible. Show a small lock icon + "Internal" badge on internal notes and an
"Customer-visible" badge (eye icon) on public ones. The composer's checkbox stays but its
label becomes "Internal note — only your team can see this". There is **no customer portal
yet**; do not add any portal link, portal preview, or copy implying the customer is reading
this today. This is future-proofing only.

`EMAIL` notes are read-only: no Edit, no Delete. An email is a record of something that was
sent or received, not a draft.

## 6. Category, subcategory, owner

The `category` enum is gone; requests now carry `categoryId`, `subcategoryId`, `ownerId`.
Fix every consumer:

- `_lib/request-format.ts` — remove `formatCategory` over the old enum.
- `request-form.tsx` — Category becomes a `Select` over the org's active categories, and
  Subcategory a dependent `Select` that is **disabled until a category is chosen** and
  repopulates from that category's `subcategories`. **Both are optional** — the schema
  allows null and so must the form; do not mark either required. Changing the category
  clears a subcategory that no longer belongs to it. Add an **Owner** field
  (`MemberPicker`, optional).
- Per `.claude/rules/data-loading.md`: the form must **not** be hidden behind a Suspense
  fallback because the category list is loading. Render the whole form immediately, start
  the category fetch on the server, pass the promise down, and disable **only** the category
  select while it resolves. An async default must never overwrite a field the user has
  already touched.
- `requests-filter-bar.tsx` — replace the category enum filter with a category filter over
  the real catalog, and add an Owner filter. Thread every filter into the `$876.requests.list()`
  call server-side; never filter returned rows in the page.
- Wherever a category is displayed, render its icon beside the name with
  `<CategoryIcon name={category.icon} />` from `@876/ui/category-icons`, tinted
  with the category's colour. The key is an untrusted stored string — always let
  `CategoryIcon` do the narrowing; never index the catalog directly.
- `requests-table.tsx` + `requests-skeleton-columns.ts` — show the category name (resolved
  from the catalog, tier 3 muted) instead of the enum, and keep the two files in step.
- `request-aside.tsx` Details card — add Category / Subcategory / Owner / Team rows,
  each showing "—" muted when unset.

## 7. The record's loading strategy

**Complaint:** "the data-fetching strategy with the skeletons isn't implemented on the
single request view page."

`(record)/layout.tsx` already streams the toolbar, identity, and aside correctly — leave
that alone. The problem is the **tab pages**: `(record)/page.tsx` and the customer/audit
pages are `async` and await their data at the top level, so nothing inside `{children}`
streams and the whole segment blocks.

Convert every `(record)/**/page.tsx` to the canonical shape:

```tsx
export default function RequestConversationPage({ params }: Props) {
  return (
    <Suspense fallback={<RequestNotesSkeleton />}>
      <ConversationData params={params} />
    </Suspense>
  )
}

async function ConversationData({ params }: Props) { /* the awaits that exist today */ }
```

- The page component is **synchronous** and does not await `params` — pass the promise
  down and await it inside the data child.
- Each fallback matches the resolved layout: `RequestNotesSkeleton` renders the real
  timeline rail with three shimmering note cards and the composer shell, not a grey block.
  Tasks/reminders get row-shaped skeletons. The customer tab gets a card-shaped one.
- **Do not add a `loading.tsx`** anywhere under `[requestId]`. The `(record)` route group
  already has a layout with boundaries, and a segment-level fallback above a route group is
  exactly the stacking `navigation-performance.md` Rule 1 forbids — `check-app-structure.mjs`
  will fail you for it.
- Keep the existing `Promise.all` batching inside each data child; do not turn parallel
  awaits into sequential ones.

## 8. Organization customers must show the organization *and* the person

**Complaint:** "for business customers I want to see the user information as well — it's
showing the organization as the customer but then showing me the user's email address,
which isn't the organization's. I need to differentiate between both."

This is real. A `CORE_ORGANIZATION` registry customer carries the org's own identity **and**
a `primaryContact` person (Phase B added both to the typed schema — see
`.claude/rules/customer-architecture.md` "Every business customer has a person attached").
Today `request-aside.tsx` and `customers/[customerId]/page.tsx` print `customer.email`
under the org name, and that email belongs to the contact, not the org.

Fix both surfaces so the two parties are never conflated:

- **`request-aside.tsx` customer card**: the org name stays the heading, with a badge that
  states what it is — "Organization" for `CORE_ORGANIZATION`, "876 account" for
  `CORE_USER`, "External" for `EXTERNAL`. Contact rows under it show the **organization's**
  own email/phone only. Then a separate, clearly labelled **Primary contact** block:
  avatar + person's name + their email + phone, each `mailto:`/`tel:` linked. When there is
  no primary contact, the block is omitted entirely — do not render an empty shell, and do
  not fall back to showing the contact's details as the org's.
- **`customers/[customerId]/page.tsx`**: same split. The `<h1>` subtitle must not be the
  contact's email when the customer is an organization; use the org's own email or, when
  it has none, the customer-type label. Replace the raw `Source: CORE_ORGANIZATION` detail
  with a human label ("876 organization" / "876 account" / "External"). Add a Primary
  contact section with the person's details.
- Put the shared shape in `src/features/customers/customer-identity.ts`: one function
  taking the registry customer and returning
  `{ title, subtitle, kindLabel, typeLabel, orgEmail, orgPhone, primaryContact }`, used by
  both surfaces so they cannot drift. Unit-test it.

---

## Tests

Follow `.claude/rules/testing.md`. Required, because each encodes a behaviour above:

1. `quick-status-selector` paints the new status **before** the mutation resolves.
2. It **reverts** to the previous status and toasts on a failed mutation.
3. It does not disable its trigger while in flight.
4. `assign-popover` calls `client.requests.update` with `{teamId}` for a team row and
   `{assigneeId}` for a person row — exact arguments.
5. Choosing a team whose members exclude the current assignee shows the
   "assignee cleared" toast; choosing one that includes them does not.
6. `noteKindStyles` returns a distinct class set for each of `DESCRIPTION`/`NOTE`/`EMAIL`.
7. An `EMAIL` note renders From/To/Subject and exposes **no** edit or delete control.
8. An `EMAIL` note with all email fields null renders without throwing.
9. `customer-identity` maps a `CORE_ORGANIZATION` customer to the org's own email, **not**
   the primary contact's — and returns the contact separately.
10. Selecting a category in `request-form` repopulates subcategories and clears a
    subcategory that no longer belongs; submitting with neither set is allowed.
11. A task toggled to done stamps optimistically and reverts on failure.

Assert exact arguments and complete shapes; `toBeDefined()` alone is not a test.

## Verification — foreground, all of them

```
pnpm --filter @876/crm-app typecheck
pnpm --filter @876/crm-app lint
pnpm --filter @876/crm-app test
node scripts/check-app-structure.mjs
npx prettier --write "apps/crm/src/**/*.{ts,tsx}"
```

Typecheck must end **clean** — this phase is what clears the `RequestCategory` fallout
Phases B and C1 left behind. If anything is still red, say exactly what and why rather than
reporting done.

**Do not commit anything.**
