# Implementation Plan: Console workspace relocation + contextual drill-down sidebar

- **Run ID:** `2026-09-03-console-workspace-and-sidebar`
- **Branch:** _not cut yet_
- **Status:** `PLANNING` — design discussion, no code written yet
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
- [ ] Add the (empty-for-now) **Operations** and **Overview** sections.
- [ ] Extract the one product-integration registry (§3.4) and fold
      `REGISTRIES`, `app-workspaces.ts`, and the per-product `_components`
      page factories into it. **Blocked on the §3.4 reading of "Integrations".**
- [ ] Update `docs/architecture/017-console-app-data-management.md`.
- [ ] **Known gap:** `MobileNav` renders in the header, above the slot, so it
      still sees only the static contexts — mobile shows the platform rail
      inside an app record. Closing it means a second `@mobilenav` slot; do it
      when Phase 3's workspace rail forces the question.

### Phase 3 — relocate the workspace

- [ ] Move the workspace routes to the location decided in Phase 0.
- [ ] Keep **one** implementation; both the org record and the product record
      link into it.
- [ ] Workspace header gains an org switcher and an app switcher.
- [ ] `?from=` entry-point tracking so back returns where the operator came from.
- [ ] Org detail keeps a launcher listing that org's entitled apps.
- [ ] Redirects (or deletion) for the old URLs, per Phase 0.

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

### Phase 4 — cross-org operations (thin)

- [ ] For **one** product only (recommend CRM requests) wire a real cross-org
      operator list end to end: owning-service operator route + guard +
      serializer → operator client entrypoint → Console module → page.
- [ ] Prove the pattern, document it, and stop. Remaining products follow later.
- [ ] **No analytics/statistics work in this run.**

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

Nothing implemented. This file is the entire artifact of the session of
2026-09-03.

Two of the three Phase 0 decisions are made and recorded above. **Phase 1 (the
sidebar) is unblocked and is where the next session starts** — it depends on
neither of the remaining questions. The one still open, the §3.4 reading of
"Integrations", blocks only Phase 2.
