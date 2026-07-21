# Brief: Separate lower widget rail card into "876 Chat" behind a feature flag

## Why

The widget dock rail (`packages/widgets/src/react/widget-popout.tsx`) currently renders
two stacked floating cards: primary (65%, widget triggers) and secondary (35%, via an
anonymous `secondary` prop). The lower card is becoming its own product surface —
**876 Chat** (org chat; icons will later be profile avatars that pop out chat windows).
This change ONLY separates the UI and gates it behind a feature flag. Do NOT implement
any chat functionality.

Behavior contract:

- Chat flag enabled → rail shows primary widgets card (65%) + 876 Chat card (35%).
- Chat flag disabled → 876 Chat card is not rendered at all and the primary widgets
  card takes the FULL rail height (single card).

## File scope (exactly these files)

1. `packages/widgets/src/react/widget-popout.tsx`
   - Export the floating card chrome so the chat card can reuse it: add
     `export const widgetFloatingCardClass = cn(...FLOATING_CARD_CHROME)` (keep the
     private `FLOATING_CARD_CHROME` array as-is).
   - In `Rail`: rename the `secondary?: ReactNode` prop to `chat?: ReactNode` (JSDoc:
     "876 Chat rail card (bottom, 35%). When absent the widgets card fills the rail.").
   - When `chat` is provided, keep today's layout: primary nav `flex-[65] basis-0`,
     then render `{chat}` directly as the sibling (the ChatRail component brings its
     own card chrome + flex sizing — do NOT wrap it in the secondary `<nav>` anymore).
     Delete the old secondary `<nav data-slot="widget-rail-secondary">`.
   - When `chat` is absent, the primary nav uses `flex-1` instead of `flex-[65]` and
     no second card renders.

2. NEW `packages/widgets/src/react/chat-rail.tsx`
   - `'use client'` component `ChatRail` (memoized like `Rail`), presentation only:
     ```tsx
     export const ChatRail = memo(function ChatRail({ className, children }: {
       className?: string
       /** Chat participant triggers (avatar buttons) — future 876 Chat surface. */
       children?: ReactNode
     }) { ... })
     ```
   - Renders a `<nav data-slot="chat-rail" aria-label="876 Chat">` with class:
     `cn('876-chat-rail flex min-h-0 flex-[35] basis-0 flex-col items-center gap-1 overflow-y-auto overscroll-contain p-1', '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden', widgetFloatingCardClass, className)`
     (import `widgetFloatingCardClass` from `./widget-popout`, `cn` from `@876/core/utils`).
   - Body: `{children}`. No empty-state text, no chat logic, no state.

3. `packages/widgets/src/react/index.ts` — export `ChatRail` (and its props type if you
   define one) alongside `WidgetPopout`.

4. `packages/widgets/src/react/widget-popout.test.tsx` — update any tests referencing
   the `secondary` prop / `widget-rail-secondary` slot. Add tests: (a) Rail without
   `chat` renders only the primary card with `flex-1` (assert no `[data-slot="chat-rail"]`
   in the DOM); (b) Rail with `chat={<ChatRail />}` renders the `chat-rail` nav with
   aria-label "876 Chat" and the primary card keeps `flex-[65]`. Follow the existing
   test style in that file and `.agents/rules/testing.md` conventions (assert both
   presence and absence).

5. `apps/api/services/feature_seeds.py` — in `FEATURE_SEEDS_BY_APP[CONSOLE_APP_SLUG]`,
   add a NEW standalone seed (no parent*slug — it is not a widgets child; it's its own
   product surface), placed after the `console_widgets*\*` entries:

   ```python
   {
       "slug": "console_chat",
       "name": "876 Chat",
       "description": "Master switch for the 876 Chat rail in Console.",
       "default_enabled": True,
   },
   ```

   `default_enabled: True` = enabled globally at creation (user-requested).

6. `apps/console/src/lib/features.ts`
   - Add `export const CHAT_FEATURE_SLUG = 'console_chat'` (named constant per
     `.agents/rules/feature-flags.md`).
   - Add `chat: false` to `DISABLED_FEATURES.uiFeatures` and
     `chat: enabledSlugs.has(CHAT_FEATURE_SLUG)` to the computed `uiFeatures`.

7. `apps/console/src/types/features.ts` — add `chat: boolean` to `ConsoleUiFeatures`.

8. `apps/console/src/components/console-shell.tsx` — add `chat: false` to the
   `uiFeatures` default object, and pass `chatEnabled={uiFeatures.chat}` to `<WidgetBar />`.

9. `apps/console/src/components/widgets/widget-bar.tsx`
   - Add prop `chatEnabled: boolean`.
   - Import `ChatRail` from `@876/widgets/react`.
   - Render `<PopoutBar.Rail chat={chatEnabled ? <ChatRail /> : undefined}>`.

10. `apps/console/src/components/widgets/widget-bar.test.tsx` — update for the new
    required `chatEnabled` prop; add tests that `chat-rail` renders when
    `chatEnabled` and does not render when `chatEnabled={false}`.

## Constraints

- Do NOT implement chat features, chat state, avatars, or any API/data work.
- Do NOT touch PostHog directly, `feature-groups.ts`, or `widgets-config`.
- Follow `.agents/rules/code-style.md` (single-statement ifs unbraced, prettier single
  quotes) and existing file idioms.
- Do NOT commit anything — the orchestrator commits.

## Verify

- `pnpm --filter @876/widgets typecheck && pnpm --filter @876/widgets test`
- `pnpm --filter @876/console typecheck` (and its test script if present)
- `cd apps/api && python -m ruff check services/feature_seeds.py`
