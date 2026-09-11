# CLAUDE.md — ApproveFlow Frontend

Next.js 14 (App Router) + TypeScript + Tailwind UI for ApproveFlow, an approval
workflow platform. It is a **pure client of the backend API** — there is no
server-side data layer, no ORM, and no business logic here. Risk scoring and
workflow routing are decided by the backend; this app renders the result.

Backend lives in the sibling `../backend` repo (separate git repo, own CLAUDE.md).

## Commands

```bash
npm run dev          # dev server on :3001 (backend is expected on :4000)
npm run build        # production build — must pass before any change is done
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
npm test             # jest (jsdom) — __tests__/**/*.test.{ts,tsx}
npm run test:watch
npm run test:coverage
npm run test:ui      # headless puppeteer smoke run (scripts/ui-smoke.js), needs both servers up
```

## Layout

```
app/
  layout.tsx            root shell, wraps AuthProvider
  login/                public sign-in page
  (app)/                authenticated route group
    layout.tsx          auth guard + Sidebar/Topbar chrome, pending-approval badge
    dashboard/ requests/ approvals/ simulator/ workflows/
components/
  ui/                   presentational kit (Button, Card, Table, Badge, Field, ...)
  layout/               Sidebar, Topbar, PageHeader
  RiskPanel, WorkflowTimeline, RequestTypeFields, TypeChip
lib/      api.ts (fetch client), auth.tsx (AuthContext), format.ts
services/ one typed module per backend resource
types/    index.ts — shared domain types, mirrors backend src/types/domain.ts
test-utils/ render.tsx, fixtures.ts, navigation.ts (helpers, never tests)
```

## Rules

### Data access
1. **All network calls go through `apiFetch` in `lib/api.ts`.** Never call `fetch`
   directly in a component, page, or service.
2. **Components never call `apiFetch` directly.** Add/extend a module in
   `services/` and call that. One service module per backend resource
   (`requestService`, `approvalService`, `workflowService`, `authService`).
3. `apiFetch` unwraps the backend envelope and returns `data` only. Service
   functions are thin, typed wrappers — no data massaging, no caching layer.
4. Errors surface as `ApiClientError` (`status`, `message`, `details`). Render
   `err.message` in the UI; never swallow an error without showing state.
5. 401 handling (clear storage → redirect to `/login`) belongs in `lib/api.ts`
   only. Do not duplicate it in pages.
6. The API base URL comes from `NEXT_PUBLIC_API_URL`. No hardcoded hosts, ports,
   or `/api` prefixes anywhere else. Keep `.env.example` in sync when adding vars.

### Auth
7. Auth state lives in `lib/auth.tsx` (`AuthProvider` / `useAuth`). Read
   `user`, `loading`, `isApprover` from it — never read the token or user from
   `localStorage` in a component.
8. Storage keys are the exported `TOKEN_KEY` / `USER_KEY` constants only.
9. Route protection belongs in `app/(app)/layout.tsx`. New authenticated pages
   go inside the `(app)` group so they inherit the guard and chrome; they must
   not re-implement their own redirect.
10. Role checks use `isApprover` or the `APPROVER_ROLES` constant, never inline
    role-string comparisons scattered through pages.

### Components & pages
11. Pages are Client Components (`'use client'`) that fetch in `useEffect` and
    own three explicit states: **loading** (`Spinner`), **error** (`ErrorNote`),
    **empty** (`EmptyRow` / empty card). Never ship a page that renders nothing
    while loading or silently blank on failure.
12. Reuse the `components/ui` kit — `Button`, `Card`, `Table`/`Th`/`Td`,
    `StatusBadge`/`RiskBadge`, `TextInput`/`Select`, `StatCard`. Add a variant to
    the kit rather than styling a one-off button or badge in a page.
13. Styling is Tailwind utility classes only. No CSS modules, no styled-components,
    no inline `style` for anything Tailwind can express. Brand colours come from
    the `brand.*` scale in `tailwind.config.ts`; extend the theme instead of
    hardcoding hex values.
14. Icons come from `components/ui/Icons.tsx` (inline SVG). Do not add an icon
    dependency.
15. Dates, currency, and relative times go through `lib/format.ts`
    (`formatCurrency`, `formatDate`). No ad-hoc `toLocaleString` calls.
16. Client-side filtering/derivation goes in `useMemo`; keep render bodies free
    of heavy work.

### Types
17. Domain types live in `types/index.ts` and must mirror the backend's
    `src/types/domain.ts`. When the backend contract changes, update these types
    in the same change — do not introduce a parallel local shape.
18. `strict` TypeScript. No `any` in new code (the existing `payload: any` in
    `api.ts` is the sole tolerated exception), no `@ts-ignore`, no non-null `!`
    on values that can genuinely be null — narrow instead.
19. Import with the `@/*` alias (`@/lib/api`, `@/components/ui/Button`). No deep
    relative chains (`../../..`).

### Testing
20. Every new page, service function, or stateful component ships with a test in
    `__tests__/`. Tests are `__tests__/**/*.test.{ts,tsx}` — helpers belong in
    `test-utils/` so Jest does not treat them as suites.
21. Render through `renderWithAuth(ui, { as: someUser })` from
    `test-utils/render.tsx`; seed users/requests from `test-utils/fixtures.ts`.
22. `next/navigation` is globally mocked in `jest.setup.ts` via
    `test-utils/navigation.ts`. Assert navigation through that mock; do not
    re-mock the module per file.
23. Mock at the **service** boundary (`jest.mock('@/services/requestService')`)
    or mock `global.fetch` for `lib/api.ts` tests. Do not hit a real backend
    from Jest.
24. Query by accessible role/label/text; drive interaction with
    `@testing-library/user-event`. No snapshot tests of whole pages, no
    querying by class name.

### General
25. Before declaring work done, run `npm run typecheck && npm test && npm run build`.
26. Never commit secrets or real credentials; `.env.local` is local-only,
    `.env.example` carries the documented placeholders.
27. Keep changes scoped to the layer that owns the concern: presentation in
    `components/`, HTTP in `services/` + `lib/api.ts`, orchestration in pages.
    Business rules (risk, routing, permissions) belong in the backend — if a
    rule seems missing, fix it there, not by re-deriving it in the UI.
