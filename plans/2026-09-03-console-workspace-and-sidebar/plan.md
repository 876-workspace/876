# Implementation Plan: Console workspace relocation + contextual drill-down sidebar

- **Run ID:** `2026-09-03-console-workspace-and-sidebar`
- **Branch:** `feat/console-contextual-sidebar`
- **Status:** `IN_PROGRESS` — Phases 1, 2, and 3 complete; Phase 3.5 (operator
  permission model) and Phase 4 (cross-org operations) not started
- **Owner:** raheemdevs

> This file is written from a long spoken briefing. It deliberately records the
> **reasoning and the open questions**, not just the tasks, because the decision
> is architectural and a fresh session must be able to pick up the argument, not
> only the checklist. Sections marked **[verbatim intent]** paraphrase the
> briefing closely and must not be "tidied" into something narrower.

---

## 1. What this is about

Two changes that the briefing treats as one, because each constrains the other:

1. **Where the org-workspace lives.** Console currently mounts each product app
   inside the organization record (`/orgs/[slug]/workspace/{crm,billing,invoice,couriers,projects}`),
   so an operator reaches CRM by going Organizations → org → Workspace → CRM →
   Requests. That works and looks good, but it is click-click-click, and it can
   only ever answer org-scoped questions.
2. **The sidebar.** Console already has a drill-down rail
   (`apps/console/src/components/shell/sidebar.tsx` — level 0 icon rail, level 1
   labelled panel, open level derived from the pathname). The briefing wants it
   to become the mechanism by which Console _changes context_ — so that entering
   `/apps` or a workspace makes Console feel like a different application, with a
   way back up.

### [verbatim intent] The frustration, stated plainly

> "It does look nice, and it is nice that we can click on these and have these
> different applications render inside of Console like it's first party. What I
> want is a better way of doing this — not what we have. I see a potential
> limitation where you have to click, click, click."

> "I'm wondering if we should relocate that under the `/apps` route instead —
> because on the main apps route we click an app and see the app overview,
> feature flags, settings, modules, widgets. Maybe it makes sense to go in there
> as well: go to app, then go to workspace, and be able to do everything from
> there. But I know that takes away from what we have right now, it being
> embedded on the organization route."

### [verbatim intent] The capability that is actually missing

This is the part that is **not** solved by moving a route, and it is the real
driver:

> "I don't want a standalone admin application for each application we have —
> CRM, Projects, Billing, Invoice, and others as products, and Enterprise itself
> which is not a product but still houses data. What if I need to take a holistic
> look at the application data? How many open requests do we have? How many total
> customers do we have right now? What's the average number of requests? What if I
> need to view **all the open requests from every organization** as an admin view?
> For the courier shipping application, what if I need to view all uncollected
> packages? What if I need to run reports?"

> "You don't have to build all of this analytics — I'm not going for that yet."

So: the missing thing is a **cross-organization, per-product operator view**.
That axis does not exist anywhere today and cannot exist under `/orgs/[slug]/`,
because that route is scoped to one organization by construction.

### [verbatim intent] Console as many applications in one

> "This boils down to something I've been thinking about for a while — having
> Console not necessarily be multiple applications but **act as if multiple
> applications in one**. So when we go to the apps route in Console, the sidebar
> changes; it's like a different application you're using. But there must be a way
> to expand the sidebar so you can see the sidebar item titles, and another button
> to go back and bring back the original Console sidebar."

> "If we put the workspace under the apps route, we inherit the sidebar for the
> application itself when going into an organization's workspace — so it's almost
> like switching sidebar twice. That's for internal ease of use, being able to
> move quickly and find the information I'm looking for, because it's internal."

> "Console is admin-only, but most likely it won't be admin-only in the long run.
> Customer service may need to access Console if we fully integrate CRM into
> Console alongside organization management. So the sidebar is the first item
> we're starting with, because you can see how consequential it is — it gives
> different context. We'll probably still have a tabbed layout for certain
> routes, but the sidebar is what changes."

---

## 2. What exists today (verified 2026-09-03)

| Thing                                                  | Where                                                                                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Console root nav registry (drill-down capable)         | `apps/console/src/components/shell/nav-config.ts`                                                                                     |
| Rail + panel component                                 | `apps/console/src/components/shell/sidebar.tsx`                                                                                       |
| Open-level resolver (derived from pathname)            | `apps/console/src/components/shell/sidebar-sections.ts`                                                                               |
| Org-mounted workspaces                                 | `apps/console/src/app/(app)/orgs/[slug]/workspace/{billing,couriers,crm,invoice,projects}`                                            |
| Workspace layout factory                               | `.../workspace/_components/app-workspace-layout.tsx`                                                                                  |
| Workspace product rail (second shell)                  | `apps/console/src/features/orgs/components/workspace-shell.tsx`                                                                       |
| Workspace nav resolution (entitlement + feature gated) | `apps/console/src/features/orgs/workspace-navigation.ts`                                                                              |
| Product registry (which apps have a workspace)         | `apps/console/src/features/orgs/app-workspaces.ts`                                                                                    |
| App administration                                     | `apps/console/src/app/(app)/apps/[slug]/{(overview),features,plans,modules,widgets,api-keys,provisioning,settings,subscribers,audit}` |
| Console's own CRM + Projects                           | `apps/console/src/app/(app)/requests`, `apps/console/src/app/(app)/projects`                                                          |

Two sidebars already exist in Console: the platform rail (`Sidebar`) and the
product rail inside a workspace (`WorkspaceShell`). The briefing's "switching
sidebar twice" is therefore **already half-built** — what is missing is that the
two are unrelated components with no shared stack model, and there is no third
context (the `/apps` product context).

Existing drill-down sections in `nav-config.ts`: `projects` and `requests`. Their
panel is a _wide labelled panel_ (`w-56`) that replaces the `3.75rem` rail. The
briefing wants that to change (see §5).

---

## 3. The routing decision

### 3.1 The two axes are different questions

| Axis                              | Question it answers           | Scope              |
| --------------------------------- | ----------------------------- | ------------------ |
| **Organization** (`/orgs/[slug]`) | "What is going on with Acme?" | one org, every app |
| **Product** (`/apps/[slug]`)      | "How is CRM doing?"           | one app, every org |

Neither subsumes the other. Support work is org-first; product operations and
reporting are app-first. Moving the workspace from one to the other trades one
blind spot for the other. **The genuine fix is to add the missing axis, and to
stop making the workspace a leaf of either tree.**

### 3.2 Recommendation — three contexts, one implementation

```
/orgs/[slug]/…            the CUSTOMER record
                          identity, members, subscriptions, billing, notes,
                          activity, support — plus a launcher listing the apps
                          this org is entitled to, each linking into its workspace

/apps/[slug]/…            the PRODUCT record
                          configuration (feature flags, plans, modules, widgets,
                          API keys, provisioning, settings) — UNCHANGED
                          + NEW: cross-org operations. All open requests across
                            every org, all uncollected packages, subscriber
                            rollups, the reporting surface described above.

/workspace/[orgSlug]/[appSlug]/…    the IN-APP view  ← the relocation
                          Console becomes that product, for that organization.
                          One implementation. Reachable from both records above.
                          Its own header carries an ORG switcher and an APP
                          switcher, so moving sideways costs one click instead of
                          climbing back up the org tree.
```

**Why a top-level `/workspace/` rather than nesting it under `/apps`:**

- It is honestly neither an org sub-page nor an app sub-page — it is the
  intersection. Nesting it under either makes the other entrance a redirect, and
  a redirect is exactly the extra click the briefing objects to.
- It makes "Console acts as many applications in one" literally true in the URL:
  `/workspace/*` is the region where the whole shell swaps. The sidebar rule
  becomes trivial to state and to test — _the platform rail is shown everywhere
  except `/workspace/*`._
- Switching org while staying in CRM, or switching app while staying on Acme, is
  a single path segment change. Under `/orgs/[slug]/workspace/crm` the first is
  natural and the second is a climb; under `/apps/crm/workspace/[org]` it is the
  reverse. Neither is good; the flat form is symmetric.
- The workspace screens are already shared product UI (`@876/<product>-ui` +
  thin Console data components per `.claude/rules/shared-product-ui.md`), so the
  move is a **host relocation, not a rewrite**. There must be exactly one
  implementation; both records link into it.

**DECIDED 2026-09-03 — `/workspace/[orgSlug]/[appSlug]`.** The user chose the
flat top-level form over nesting under `/apps`. Both records link straight in;
neither entrance is a redirect. Do not revisit without a new decision recorded
here.

- [ ] Still open (Phase 3, low stakes): do the old `/orgs/[slug]/workspace/*`
      URLs redirect for a window, or disappear outright? They are internal and
      unbookmarked by customers, so a clean move is defensible.

### 3.3 What the app-axis (`/apps/[slug]`) gains

New sections under the product record, all cross-org, all operator-tier:

- **Operations** — the product's own records across every organization
  (CRM: all requests · Couriers: all packages / uncollected · Invoice + Billing:
  all invoices, all payments · Projects: all issues).
  Each row names its owning organization and links into that org's workspace.
- **Overview / reporting** — counts and simple rollups (open requests, total
  customers, average requests per org, uncollected package count).
  **Not in scope for this run** beyond leaving the route and the empty shell in
  place. The briefing is explicit: _"I'm not saying you should build all of this
  statistics… that's not what I'm going for, at least not yet."_

Both need cross-org operator capabilities in the owning services. Per
`.claude/rules/access-tiers.md`, a capability is implemented once by the owning
service and merely routed at a new principal — so this is an operator route +
guard + serializer change in each product API, **never** a second implementation
in Console. Expect several products to have no cross-org list operation yet;
that is backend work, not a reason to filter in Console.

### 3.4 Integrations

The briefing opens with _"reimagine the workspace Integrations into Console, as
well as our own custom integration of CRM and Projects."_ Reading: the way
Console integrates each product (CRM, Projects, Invoice, Billing, Couriers) is
currently one-off per product — `_components/finance-workspace-pages.tsx`,
`couriers-workspace-pages.tsx`, a `REGISTRIES` map in `workspace-navigation.ts`
that only knows Billing and Invoice. Adding a product means editing several
places.

Target: **one product-integration registry** that declares, per product:
its app slug, its workspace segment, its nav registry, its icon, its permission
prefix, its cross-org operations surface, and its Console data module. Adding a
product app to Console should be a registration, not a rewrite — this is exactly
what `docs/architecture/017-console-app-data-management.md` already sets out
(capability → operator route → tier client → bounded client → entitlement-gated
surface). Phase 2 should extend that document rather than invent a parallel one.

- [ ] Confirm this reading of "Integrations" with the user. If it instead means
      _third-party_ integrations (an org's connected external systems, per the
      `integration` tier in `access-tiers.md`), this whole subsection is wrong and
      needs rewriting.

---

## 4. Navigation model: a context stack

The sidebar stops being "one rail with optional panels" and becomes a **stack of
navigation contexts**. Exactly one context is mounted at a time; each knows its
parent.

```
Level 0   PLATFORM        Dashboards · Users · Orgs · Projects · Requests ·
                          Security · Apps · Widgets · Storage · Reports · Settings

Level 1   SECTION         entered from a level-0 entry that owns a subtree
                          (Projects, Requests today; Apps and Orgs next)
                          back → PLATFORM

Level 1   PRODUCT         entered at /apps/[slug] — the product's own admin nav
                          (Overview · Operations · Feature flags · Plans ·
                           Modules · Widgets · API keys · Provisioning · Settings)
                          back → PLATFORM

Level 2   WORKSPACE       entered at /workspace/[orgSlug]/[appSlug]
                          the product's REAL nav, as that org's members see it,
                          entitlement- and feature-filtered
                          back → PRODUCT (or ORG, depending on where you came in)
```

Rules that must hold:

- **The open context is derived from the pathname**, never from click state —
  the existing `resolveOpenSectionKey` design. Deep link, refresh, and browser
  back must all land on the correct context with nothing to keep in sync.
  The only local state is the deliberate collapse/expand.
- **Back goes up the stack, not back in history.** From a workspace, back reaches
  the product; from the product, back reaches the platform rail. Where the user
  entered a workspace from an org, back should return to that org — record the
  entry point in a search param (`?from=org`) rather than in state.
- **The registry stays plain, RSC-serializable data** — string icon keys, no
  components, no functions (`.claude/rules/access-control.md`). Resolve and
  filter on the server before it reaches the browser.
- **Every entry's `requires.permission` equals the permission its destination
  route guards**, with the binding test extended to the new contexts. Hiding a
  link is never the security boundary.
- No `proxy.ts` / `middleware.ts`. Guards stay in RSC layouts
  (`.claude/rules/navigation-performance.md`).

---

## 5. The sidebar itself — behaviour spec

### [verbatim intent]

> "As it is right now, when you click on Requests and the sidebar changes, it
> goes all the way to the top. In Console I want that to change the sidebar
> completely and it will **stay collapsed**. And I want maybe that Apple bounce
> or spring — because there are fewer items rendered, the sidebar height is going
> to shrink, so make it bounce."

> "There must be a way in which you can expand the sidebar so you can see the
> sidebar item titles, and also another button to go back and bring back the
> original Console sidebar."

### The spec

1. **Vertically centred.** The card sits centred in the viewport's left gutter,
   not pinned to the top. `items-center` on the aside's cross axis is already
   there; the change is `justify-center` on the main axis so the card floats
   mid-height. As the row count shrinks, it should shrink **from both ends**
   toward its centre rather than collapsing upward.
2. **Collapsed is the default at every level.** Entering a section swaps the
   _contents_ of the rail, keeping the `3.75rem` icon rail. Today it widens to a
   `w-56` labelled panel automatically — that is the behaviour being replaced.
   Labels come from tooltips until the operator expands.
3. **Expand is explicit and sticky.** A dedicated expand/collapse control widens
   the card to show titles. The choice persists across navigations within the
   session (localStorage, per `.claude/rules/performance-client-fetching.md`
   versioned-key + try/catch rules) — an operator who wants labels wants them
   everywhere, not once.
4. **Back is a separate control from expand.** Two distinct affordances, never
   one button doing both. Back pops one level of the context stack.
5. **Spring, not ease.** The height change gets an overshoot/settle curve, not
   the current `cubic-bezier(0.32,0.72,0,1)` ease. Height only interpolates from
   `auto` where `interpolate-size: allow-keywords` is supported (already set) —
   everywhere else it snaps, which is acceptable. Honour
   `prefers-reduced-motion` by dropping to no transition, as the current code
   already does.
6. **One level mounted at a time**, so the card's height always matches what is
   actually showing. (Already true; must stay true.)
7. **Mobile** (`mobile-nav.tsx`) mirrors the same stack, as a sheet.

### Open questions on the sidebar

- **DECIDED 2026-09-03 — full replacement.** No persistent platform strip. When
  a product or workspace context opens, the platform rail is gone and the back
  control is the only way up the stack. Do not add a Slack-style always-on strip.
- [ ] Bounce amplitude: a real spring (overshoot ~4–6%) or a restrained one?
      Needs to be seen, not specified. Build it adjustable and look at it.
- [ ] Does the expand state persist per context or globally? (Recommend global.)

---

### 5.1 What "spring" means here — and what the sidebar is becoming

**[verbatim intent]**

> "The spring animation I'm actually referring to is the Apple-like spring
> animation — I've increasingly been seeing it on different websites. And
> different things on the sidebar: the sidebar can hold a card, a separate button,
> a promotional card, a 'live now' — those things we might eventually add to our
> sidebars as well, given that we're now making the sidebar really dynamic."

Two consequences:

1. **Spring means real spring physics, not a bezier.** An ease curve decelerates
   into its target; a spring overshoots and settles, and its character comes from
   stiffness / damping / mass rather than from four control points. Because the
   height is content-driven (`interpolate-size: allow-keywords`), a CSS
   `linear()` easing generated from spring parameters is the right tool — it keeps
   the animation declarative and reduced-motion-friendly while producing real
   overshoot-and-settle. Expose the constants as named tokens
   (`--876-spring-rail`, …) so amplitude is tunable by eye, not by editing
   components.
2. **The sidebar is no longer only links.** It must accept **slots** — a card, a
   standalone button, a promotional/announcement card, a live-status indicator —
   alongside nav entries. Design the rail as _a container with a nav region plus
   declared slot regions_ (top, above-nav, below-nav, footer), not as "a list of
   links with extras bolted on". Every slot needs a **collapsed form**
   (icon-sized, tooltip-labelled) as well as an expanded one, because the rail is
   collapsed by default at every level.
   - Slots are **declared as plain data alongside nav entries** so the registry
     stays RSC-serializable; a slot needing rich rendering names a component key
     the client shell resolves, exactly as `nav-icons.tsx` resolves icon keys.
   - Slots are permission- and feature-gated by the same mechanism as entries.

### 5.2 Build it in Console, structured for extraction

**[verbatim intent]**

> "This is only being implemented in Console, however it might be expanded into
> different applications in the wider ecosystem overall. So I want proper
> component practices and structure and proper naming conventions when it comes to
> all this integration, and proper documentation for future use."

This is a direct instance of the promotion path in
`.claude/rules/app-structure.md`: a component starts route-local, moves to
`features/`, and moves to `packages/ui` when a **second app** needs it. Console
is the first app; Couriers, Billing, Invoice and CRM are plausible second ones.

- Build it under `apps/console/src/components/shell/` **but with no Console
  knowledge inside the primitives.** The stack resolver, the rail, the slot
  regions, the spring tokens and the expand persistence take registry data and
  callbacks; they must not import Console routes, Console permissions, or
  `@/lib/services/*`.
- Console-specific pieces — the registry, the product-integration map, the
  permission keys — stay in Console and are passed in.
- **Do not create the package now.** Extract to `@876/ui/nav-rail` (or similar)
  when a second app adopts it, per the rule. Premature extraction is its own
  failure mode (`ai-code-quality.md` § abstraction budget).
- Naming per `.claude/rules/app-structure.md`: kebab-case files, PascalCase
  exports, **no `Console` prefix inside Console**. Where a name collides with a
  `@876/ui` primitive, alias the import — never re-prefix the local component.
- Write the documentation as the code lands, not after: a `README.md` beside the
  shell components covering the context-stack model, how to declare a context,
  how to declare a slot, and the spring tokens. That README is what makes the
  eventual extraction a move rather than an archaeology exercise.

### 5.3 Contexts with no app behind them yet (Storage)

**[verbatim intent]**

> "Look at Storage — we don't have a Storage app as yet. What we do have is
> information in storage being shared. Storage will be one of those routes that
> change sidebars, but I don't have any plans for that yet. You can probably
> implement it as a changeable/adjustable starting place, but we won't have any
> sidebar options or UI elements to put, because we haven't built the Storage app.
> You just build the underlying."

The context-stack mechanism must therefore tolerate a **declared context with
zero entries**. Storage is the test case: declare the context, render the rail
with its back control and nothing else, and let entries arrive later by editing
data only.

- An empty context must render — not crash, and not silently fall back to the
  platform rail. The swap itself is the feature being proven.
- This is the opposite of the existing `resolveNavigation` rule that removes an
  empty group. Keep that rule for **groups inside a context**; a declared
  **context** is allowed to be empty. Pin the distinction with a test.
- Do not build Storage screens. `.claude/rules/storage-architecture.md` is
  explicit that 876 Drive is deferred; this is the rail only.

---

## 6. Permissions — Console operators acting inside a product

**[verbatim intent]**

> "My thought on the requests route is: if we go that route, how will it inherit
> the sidebar items, and then the permissions come along — because the sidebar
> items are rendered by permissions in the different applications as well. That
> would be for the requests page, as not everybody in Console will have access to
> that information, or to do advanced stuff for CRM."

> "What I'm also considering is Console roles and permissions for the different
> app integrations. If we integrate that into Console, do the integration
> permissions need to be based on the application itself, based on their modules,
> following that same module permission settings format? Let's say we have a
> customer service representative who may only need read access. Say we implement
> a dispute feature — think of how PayPal has a dispute, where you dispute
> something with a vendor, and if the vendor is giving issues you raise it to
> PayPal and PayPal intervenes. Think of a scenario where we have to intervene on
> a ticket, or we're doing customer support on a company whose records are
> corrupted and the entire system is failing — we could go in and delete or purge
> something completely, but **not every Console member will have purge access**."

### 6.1 The answer: same vocabulary, different plane, plus operator-only keys

Yes — Console's integration permissions follow the **same `<module>.<action>`
catalog format** the products already use (`.claude/rules/access-control.md`,
`.claude/rules/app-access.md`). But three things stay separate, and conflating
any two of them is the failure mode:

| Who                                             | Vocabulary                                                     | Storage plane                                              | Granted to         |
| ----------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------- | ------------------ |
| **Org member** in CRM                           | the product's `AppPermissionCatalog`                           | platform app-access plane (`app_roles`, `app_assignments`) | that org's members |
| **Console operator** acting inside CRM          | **the same catalog, projected**                                | **Console's own datastore**                                | Console operators  |
| **Console operator** doing what only 876 can do | **Console-owned operator keys** — never in the product catalog | Console's own datastore                                    | Console operators  |

- **Share the vocabulary, never the store.** The product declares its catalog
  once, as code (`@876/core/access/catalogs`). Console's role editor renders that
  same catalog grouped by product, so `requests.view` means the same thing to a
  CRM member and to an operator. But the operator's grant lives in Console's
  datastore and resolves through Console's own `resolveEffectivePermissions` — an
  operator is not a member of any organization and must never acquire access by
  being one (`access-control.md` § Console affiliation policy).
- **Namespace projected keys by product** so `requests.view` from CRM cannot
  collide with a future product's: `crm/requests.view`, `couriers/packages.edit`,
  `billing/invoices.view`. Keep the `<module>.<action>` tail byte-identical to the
  product's own key so the projection is mechanical and testable.
- **Operator-exclusive actions are a separate, Console-owned set.** Purge,
  intervene-on-a-dispute, disclose a sensitive identifier, force-reconcile,
  impersonate — these have **no org-member equivalent** and must never appear in a
  product's catalog, because a vendor's own admin must not be able to grant
  themselves platform intervention. They are Console keys: `console:crm.purge`,
  `console:crm.intervene`, `console:couriers.purge`. This is exactly the
  PayPal-dispute shape — the vendor acts on the dispute as a _party_; only 876
  adjudicates it.
- **The CSR case falls straight out.** A customer-service role holds the read tail
  of several product catalogs (`crm/requests.view`, `crm/customers.view`) and
  **no** operator-exclusive keys. A platform-engineering role additionally holds
  `console:crm.purge`. Read access and destructive access are different grants,
  never two affordances on one grant.
- **Purge stays distinct from Delete.** Console already separates reversible
  Delete from destructive Purge across the ecosystem
  (`.claude/rules/deletions.md`); the permission model mirrors that split rather
  than folding both into one `*.delete` key.

### 6.2 How the workspace rail inherits permissions — the change required

Today `apps/console/src/features/orgs/workspace-navigation.ts` deliberately
projects the product's **full** permission vocabulary to the operator and filters
the rail only by the organization's entitlement and feature rollout. Its own
comment says so:

> "An operator is a Console admin, not a member of the organization, so they are
> projected the product's full permission vocabulary — everything the registry
> references."

That was correct while every Console operator was a full admin. It stops being
correct the moment a CSR role exists. The change:

```
visible(entry) =
      org holds the entitlement                    (unchanged)
  AND org has the feature rollout                  (unchanged)
  AND operator holds the projected product key     (NEW)
```

All three are ANDed. The first two are properties of the **organization**; the
third is a property of the **operator**. Do not collapse them into one filter —
they fail for different reasons and need different messages ("this org doesn't
have Banking" vs "you don't have access to Banking").

The three-layer rule from `access-control.md` still holds throughout: navigation
visibility is UX, the route guard is security, and the mutating route handler
authorizes again before touching an operator client. Hiding a rail item is never
the boundary.

### 6.3 The same applies to Console's own CRM and Projects

`/requests` and `/projects` are Console's own use of CRM and Projects, gated
today by single coarse keys (`console:requests`, `console:projects`). They need
the same module-level breakdown, for the same stated reason — "not everybody in
Console will have access to that information, or to do advanced stuff for CRM."

### 6.4 Open questions on permissions

- [ ] Is the product→Console key projection **generated** from the product
      catalog at build/seed time, or hand-declared in Console's catalog?
      Generated is safer; either way it needs a drift test.
- [ ] Does an operator-exclusive key **imply** the matching read key
      (`console:crm.purge` ⇒ `crm/requests.view`)? Recommend **no** — implication
      is how privilege quietly widens.
- [ ] Where does the role editor live — Settings → Roles as today, or a per-product
      tab under `/apps/[slug]`? Recommend Settings → Roles, grouped by product, so
      one screen answers "what can this role do anywhere".
- [ ] Dispute/intervention is a **product feature that does not exist yet**. This
      run must not build it — only leave the permission model able to express it.

---

## 8. Phases

Each phase is its own branch and PR into a `develop`-style integration branch
per `.claude/rules/git.md` § Feature Integration Branches. **The plan, not the
phase, is the unit of completion** (`.claude/rules/execution-autonomy.md`).

### Phase 0 — decisions

- [x] §3.2 routing — **`/workspace/[orgSlug]/[appSlug]`**, flat and top-level.
- [x] §5 rail swap — **full replacement**, no persistent platform strip.
- [ ] Confirm the §3.4 reading of "Integrations" (blocks Phase 2 only).
- [ ] §5 bounce amplitude — build it adjustable and look at it, don't specify it.
- [ ] §5 expand persistence — recommend global; confirm when it is built.

### Phase 1 — the sidebar ✅ COMPLETE (branch `feat/console-contextual-sidebar`)

- [x] Vertically centre the card; shrink from the centre.
- [x] Keep the rail collapsed when a context opens; swap contents, not width.
- [x] Add the expand/collapse control, persisted globally under a versioned key.
- [x] Separate the back control from expand; back pops the context stack and
      names the level it returns to.
- [x] Replace the height ease with a spring; reduced-motion fallback.
- [x] Generalize `sidebar-sections.ts` into `sidebar-context.ts` — a context
      stack that can also carry a product or workspace level.
- [x] Mirror the stack in `mobile-nav.tsx`.
- [x] Spring expressed as generated `linear()` easing from named tokens.
- [x] Slot regions declared as data, gated by the shared nav predicate, zero
      real slots shipped.
- [x] A declared context may be empty; Storage is the standing test case.
- [x] Primitives free of Console knowledge; no package extracted.
- [x] `README.md` beside the shell components.
- [x] Tests: context resolution, back target, entry-opens-context, active entry,
      expand persistence, spring properties, empty context, slot gating, and the
      registry↔route permission binding test still passing.

Verified in the foreground: `typecheck` clean, `lint` 0 errors, `test`
158 files / 1512 tests passing, `check-app-structure` OK, plus
`packages/core` 713 tests passing.

Two things the GPT-web draft had that were corrected rather than kept: the
platform rail had lost its group dividers (contexts now carry groups, not a flat
entry list), and an entry-less context could not be reopened after a back-out
because "does this open a context" was asked of `children` rather than the href.

### Phase 2 — the product context under `/apps/[slug]`

**DECIDED 2026-09-03 — the `@sidebar` parallel route slot.** A route segment
renders its own sidebar into a slot on `(app)/layout.tsx`, so a context can be
built from data only that segment has, still server-resolved and still derived
from the URL.

- [x] `@sidebar` slot on `(app)`, with `default.tsx` for every unmatched route.
- [x] `ConsoleSidebar` resolves access context, navigation, and slots once, so a
      slot page supplies only the contexts its segment owns.
- [x] `/apps/[slug]/[[...section]]` contributes the product context, kind-resolved
      through the existing app lookup. The optional catch-all keeps the rail in
      place below the record.
- [x] The tab strip and the product rail render from **one** section list
      (`features/apps/app-detail-nav.ts`), with a test asserting their hrefs
      match, so a section cannot exist on one and not the other.
- [x] Add the (empty-for-now) **Operations** section (2026-09-04): a new
      product-only `SECTIONS.operations` entry in `app-detail-nav.ts`, an empty
      `apps/[slug]/operations/page.tsx` placeholder (same shape as `audit`), and
      an `operations` icon key. The tab strip and product sidebar context both
      derive from `appDetailSections`, so no separate wiring was needed — the
      existing binding test (`app-detail-nav.sidebar.test.ts`) already proves
      the tab and the rail entry cannot drift. **Overview** already existed and
      already serves as the reporting/rollup surface described in §3.3 (billing
      stats today) — no separate item was needed for it.
- [x] **§3.4 confirmed with the user (2026-09-04): the product-integration
      registry reading, not third-party integrations.** Proceeded with the
      registry consolidation below.
- [x] Folded the duplicate identity out of the two registries (2026-09-04).
      `workspace-navigation.ts`'s `REGISTRIES` map (appSlug + Billing/Invoice
      `NavGroupDefinition[]`, keyed by workspace segment) restated the same
      `appSlug` `app-workspaces.ts`'s `APP_WORKSPACES` already declared, so the
      two could in principle disagree. `AppWorkspace` gained an optional
      `navigationGroups` field; Billing and Invoice's groups moved onto their
      entry; `resolveWorkspaceNavigation` now reads
      `workspaceDefinition.navigationGroups`/`appSlug` directly, and
      `REGISTRIES` is gone. CRM/Projects/Couriers are unaffected — they still
      fall back to `sections` unfiltered, because those products' navigation
      has not moved into a shared contract package yet (that is real
      cross-package work, out of scope here).

      **Scoped down from the plan's literal ask.** "Fold the per-product
          `_components` page factories into it" was not done: `finance-workspace-
          pages.tsx` (Billing/Invoice, already shared) and
          `couriers-workspace-pages.tsx` are real React components with Suspense
          boundaries and data fetching, not data a registry can hold, and were
          already correctly factored (one factory per plane, parameterized by
          `workspaceKey`/`appLabel`) — merging them further had no duplication to
          remove and only risk to add. The `navigationGroups`/`permission prefix`/
          `cross-org ops surface`/`Console data module` fields from the plan's
          full spec were **not** added speculatively: `permission prefix` and
          `cross-org ops surface` have no consumer until Phase 3.5/4 exist, and
          adding unused fields now is exactly what `ai-code-quality.md`'s
          abstraction budget forbids. Add them when Phase 3.5/4 need them.

- [x] Updated `docs/architecture/017-console-app-data-management.md`
      (2026-09-04): added a "Registering a product's workspace surface"
      section naming `APP_WORKSPACES` as the concrete registration point, and
      fixed a stale reference to composing onto a "canonical `$876` server
      facade" — that aggregator does not exist and current rules
      (`sdk-conventions.md`, `workspace-control-plane.md`) forbid it; Console
      composes explicit bounded roots under `src/lib/services/`.
- [x] **Known gap closed in Phase 3**, not here: a second `@mobilenav` slot
      mirrors `@sidebar` (see Phase 3), so mobile now sees the product/workspace
      context in both places. The line above is stale; left for the record.

### Phase 3 — relocate the workspace ✅ COMPLETE

- [x] Move the workspace routes to `/workspace/[orgSlug]/[appSlug]`.
- [x] Keep **one** implementation; the org record links into it through
      `entitledAppHref`, and `/workspace/[orgSlug]` is the launcher index.
- [x] Old URLs **redirected**, in `apps/console/next.config.ts`:
      `/orgs/:orgSlug/workspace` and `/orgs/:orgSlug/workspace/:path*` point at
      the new shape. Temporary (307), not permanent — a 308 is cached by the
      browser indefinitely, and the old segment may be wanted back.
- [x] Every hand-built workspace href now goes through `workspaceBase()`.
      Eleven sites in CRM and Projects still emitted `/orgs/<org>/workspace/...`
      after the move and were only caught by two failing toolbar tests.
- [x] `WorkspaceShell` renders the organization name. `orgName` was declared,
      streamed by the layout, and never destructured, so the rail named the
      product but never the organization — survivable while the workspace was a
      tab of the org record, wrong once it became a top-level context.
- [x] Dropped `WorkspaceShell`'s `orgSlug` prop; nothing read it.
- [x] `docs/architecture/017` and `018` updated to the new path.
- [x] The sidebar slot uses a **required** catch-all
      (`workspace/[orgSlug]/[...section]`). An optional one collides with the
      `/workspace/[orgSlug]` launcher page: _"You cannot define a route with the
      same specificity as a optional catch-all route"_. **This is a dev-server
      error only** — `typecheck`, `next typegen`, `lint`, `test`, and
      `check-app-structure` all passed with the broken tree, and it was found by
      the user starting the dev server. Any future `@sidebar` slot for a segment
      that is also a real page needs the same shape.
- [x] **The second rail is absorbed into the main sidebar** (decided with the
      user, 2026-09-03). `@sidebar/workspace/[orgSlug]/[[...section]]`
      contributes a `workspace` context, exactly as the app record does, so
      entering a workspace swaps the whole rail to that product's navigation
      and the back control returns. `WorkspaceShell` and `WorkspaceNav` are
      **deleted** rather than left beside it — two renderings of the same
      navigation is the drift this phase exists to remove. The layout keeps
      only the entitlement notice, which is frame-level and streams.
- [x] `SidebarContext` gains an optional `subtitle`. A workspace names two
      things — one product, for one organization — and the rail is now the only
      chrome that says which organization. An app record leaves it unset.
- [x] One icon registry. `WorkspaceIcon` resolved keys through its own private
      map while the rail resolved the same keys through `NAV_ICONS`; the ten
      workspace keys `NAV_ICONS` lacked would have silently fallen back to a
      generic square. `NAV_ICONS` now owns the mapping, `workspace-icon.tsx`
      owns only the accent colours, and a test asserts every workspace key is
      declared.
- [x] `workspaceSectionLinks()` returns a `key`, so the resolved rail and the
      registry fallback rail are the same shape.
- [x] Workspace header with an **organization switcher** and an **app
      switcher**, rendered by the workspace layout above every section. The org
      switcher keeps the operator in the same product across organizations —
      that is the cross-organization axis §1 says is missing — and the app
      switcher moves between the products one organization is entitled to.
- [x] **`?from=` entry-point tracking.** The organization record appends
      `?from=/orgs/<slug>` to its app tabs, and the workspace header resolves it
      through `resolveWorkspaceReturn`, which **derives the label rather than
      accepting one** and rejects any destination that leaves the origin. Kept
      out of the delegated brief and written directly, per `cli.md`: `from` is
      attacker-controlled. 28 tests, including a hostile-input corpus.
- [x] **Mobile gap closed.** A second `@mobilenav` parallel slot mirrors
      `@sidebar`, so a phone shows the product's navigation inside both an app
      record and a workspace. The two slots share one context resolver per
      segment (`resolveWorkspaceContexts`, `resolveAppContexts`), so the rail and
      the sheet cannot drift.
- [x] `Shell` no longer renders `MobileNav` itself; it takes the node, exactly
      as it already took `sidebar`.

### Phase 3.5 — the operator permission model (§6)

- [ ] Project each product catalog into Console-namespaced keys
      (`crm/requests.view`), with a drift test against the product catalog.
- [ ] Add the Console-owned operator-exclusive keys (`console:crm.purge`,
      `console:crm.intervene`), separate from the projected set, with Purge
      distinct from Delete.
- [ ] AND the operator's projected key into `workspace-navigation.ts` alongside
      entitlement and feature (§6.2), with distinct empty-state messages.
- [ ] Break `/requests` and `/projects` out of their coarse single keys (§6.3).
- [ ] Role editor renders the catalog grouped by product.
- [ ] Tests: exact visible-href sets per role (CSR vs platform admin),
      registry↔route binding for every new key, guard-coverage for every mutating
      route, and an assertion that an operator-exclusive key implies nothing.

### Phase 4 — cross-org operations (thin) ✅ COMPLETE

- [x] For **one** product only (recommend CRM requests) wire a real cross-org
      operator list end to end: owning-service operator route + guard +
      serializer → operator client entrypoint → Console module → page.
      Landed across commits `1ecd8aef`, `2435e13d`, and `abcaeb3c`:
      - `apps/crm-api/src/modules/requests/requests.repository.ts`
      - `apps/crm-api/src/modules/requests/requests.routes.ts`
      - `apps/crm-api/src/modules/requests/requests.controller.ts`
      - `packages/crm/src/operator.ts`
      - `packages/crm/src/resources/operator-requests.ts`
      - `apps/console/src/lib/services/crm.ts`
      - `apps/console/src/app/(app)/requests/all/page.tsx`
      - `apps/console/src/app/(app)/requests/all/_components/all-requests-table-data.tsx`
- [x] Prove the pattern, document it, and stop. Documented in
      `docs/architecture/017-console-app-data-management.md`
      ("Cross-organization operator lists"). Remaining products follow later.
- **No analytics/statistics work in this run.** (Standing constraint note.)

---

## 9. Constraints that must not be traded away

- One implementation per screen. Two mounts of the same component is fine; two
  copies is the failure this plan exists to prevent (`ai-code-quality.md`,
  `shared-product-ui.md`).
- A cross-org capability is implemented once in the owning service and routed at
  the operator principal — never re-implemented in Console (`access-tiers.md`).
- Console route handlers authorize with `requireConsolePermission` **before**
  touching an operator client, and audit every read of customer-identifying data
  and every mutation (`access-tiers.md`).
- Nav registry stays plain data across the RSC boundary; nav visibility is never
  the security boundary (`access-control.md`).
- No `proxy.ts`/`middleware.ts`; guards live in RSC layouts. Keep guards cheap
  and `React.cache`-memoized (`navigation-performance.md` Rule 3).
- Chrome is never a skeleton; `loading.tsx` must not stack over a route group
  (root `CLAUDE.md` → Loading States, `navigation-performance.md` Rules 1–2).
- Console is admin-only **today**, not forever — customer service is a plausible
  future audience. Do not bake "every operator sees everything" into the
  navigation or the guards.

## 10. Verification

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
node scripts/check-app-structure.mjs

# Route-shape errors are invisible to every gate above. Boot the app whenever a
# route tree, a parallel slot, or a layout changes.
pnpm --filter @876/console dev
```

## 11. Prior attempt on this phase

A GPT-web pass produced `feat/console-workspace-sidebar-phase-1` (PR #470,
draft). It is merged into `feat/console-contextual-sidebar` as the starting
point for Phase 1 rather than discarded, but **it was never executed** — its own
report says the session could not run typecheck, lint, or tests, and claims no
passing result. Per `.claude/rules/cli.md`, treat its tests as drafts that have
never run and verify every file. What it added:

```
README.md · sidebar-context-config.ts · sidebar-motion.ts · sidebar-slots.ts
sidebar-preferences.ts · sidebar-sections.ts (rewritten) · sidebar.tsx (rewritten)
mobile-nav.tsx · shell.tsx    + four test files
```

## 12. Handoff state

**Updated 2026-09-04 02:55 UTC.** Written for a fresh session picking this up
cold. Read this section first, then §8 Phases.

### Where the work is

| Phase                                    | State                                                |
| ---------------------------------------- | ---------------------------------------------------- |
| 1 — the sidebar                          | ✅ complete                                          |
| 2 — product context under `/apps/[slug]` | ✅ except the integration registry (blocked on §3.4) |
| 3 — relocate the workspace               | ✅ complete                                          |
| 3.5 — operator permission model          | 🔄 **another session, uncommitted, see below**       |
| 4 — cross-org operator list              | ✅ complete                                          |

**PR [#471](https://github.com/876-workspace/876/pull/471)** is open against
`main` — "feat(console): make the sidebar contextual and move org workspaces to
a top-level route". Its red checks are **pre-existing repo state, not this
branch**: `verify` and `structure` also fail on `main`, and all 11 Cloudflare
Workers Builds are red repo-wide. Confirm that before spending time on them.

### Two other agents are in this working tree

This branch is being written by more than one agent at once. Check
`git status` and `git log` before assuming anything is yours.

**1. Another Claude session — Phase 3.5, uncommitted.** It is projecting product
permission catalogs into Console-namespaced operator keys. Its in-flight files:

```
apps/console/src/lib/operator-permissions.ts        (new)
apps/console/src/lib/permissions.ts
apps/console/src/lib/auth/access-context.ts
apps/console/src/features/orgs/workspace-contexts.ts
apps/console/src/app/(app)/@sidebar/workspace/[orgSlug]/[...section]/page.tsx
apps/console/src/app/(app)/@mobilenav/workspace/[orgSlug]/[...section]/page.tsx
```

> **`pnpm --filter @876/console typecheck` currently FAILS**, on
> `src/features/orgs/workspace-contexts.test.ts` — "Expected 3 arguments, but
> got 2", at 7 call sites. That session added a third `operatorPermissions`
> parameter to `resolveWorkspaceContexts` and has not updated the test yet.
> **The committed HEAD is self-consistent**; only the working tree is broken.
> Do not "fix" it — you will collide with an agent mid-edit.

**2. Codex (`gpt-5.6-terra`, medium) — Phase 4 (DONE).** The Phase 4 slice landed
in commits `1ecd8aef` (CRM API cross-org endpoint & query), `2435e13d` (CRM operator
client method), and `abcaeb3c` (Console page and table component); report in
`reports/codex/2026-09-04-crm-cross-org-requests.md` (`435193d2`). Documented in
`docs/architecture/017-console-app-data-management.md` ("Cross-organization
operator lists"). Wiring the nav entry and permission key remains deferred until
Phase 3.5 lands.

### What is genuinely left

1. Add the `/requests/all` nav entry + permission key **after** Phase 3.5 lands
   (the Phase 4 slice itself has landed; see commits `1ecd8aef`, `2435e13d`, and
   `abcaeb3c`).
2. ~~Phase 2's integration registry~~ — **done.** §3.4 was confirmed with the
   user 2026-09-04 (registry consolidation, not third-party integrations) and
   the registry was folded into `app-workspaces.ts` in `66d7591f`. This item
   was stale; Phase 2 §8 already shows it checked off.
3. ~~`/projects` and `/workspace/<org>/projects` path helpers~~ — **done.**
   Consolidated onto `projectsBase()` in `app-workspaces.ts`, commit
   `b0892196`.

### Lessons this run paid for — do not relearn them

- **A route-shape error is invisible to every static gate.** An optional
  catch-all in a parallel slot collides with a real page at the same node, and
  `typecheck`, `next typegen`, `lint`, 1500+ tests and `check-app-structure` all
  passed on a tree that could not boot. Only `pnpm dev` catches it. §10 now
  includes it.
- **`agy` cannot be backgrounded here.** It initialises, runs a few steps, then
  dies with no error event and exit 0 — twice, including with
  `setsid`/`nohup`/`disown`. Quota was 90%. Run it in the **foreground**, which
  is what `cli.md`'s routing table prescribes for docs work anyway. Foreground
  succeeded first time.
- **Verify a delegate's premises, not its confidence.** `agy` documented a
  `navigationGroups` registry field that looked invented; it was real, added by
  the other session in `66d7591f`. The check was cheap and the delegate was
  right.
