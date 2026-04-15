# Billing Frontend App Flow

This document explains how the app works at runtime, from first page load to CRUD/API interactions.

## 1) Startup and global wrappers

When the app starts, `src/app/layout.tsx` renders the root HTML/body and wraps all pages with `AppProviders`.

`AppProviders` (`src/components/providers/AppProviders.tsx`) applies providers in this order:

1. `QueryProvider` (TanStack Query client + cache)
2. `AuthProvider` (token + login/logout state)
3. `DisplayCurrencyProvider` (global display currency / conversion behavior)
4. `AppToastContainer` (global notifications)

So every page has:
- data fetching/caching
- auth state
- currency formatting/conversion
- toast notifications

## 2) Route entry flow

- `src/app/page.tsx` immediately redirects to `appPaths.dashboard` (`/dashboard`).
- Login route is under `src/app/login`.
- Authenticated app routes are under `src/app/(app)/*`.

`src/app/(app)/layout.tsx` wraps protected pages with `AppShell`.

## 3) Auth guard and shell flow

`AppShell` (`src/components/layout/AppShell.tsx`) does two things:

1. Renders app chrome:
   - sidebar (`AppSidebar`)
   - top bar (`AppTopBar`)
   - scroll container for page content

2. Protects authenticated routes:
   - waits for hydration
   - reads `token` from `useAuth()`
   - if no token after hydration, redirects to `/login`

## 4) Authentication data flow

`AuthProvider` (`src/contexts/auth-context.tsx`) is wired to token storage using:
- `useSyncExternalStore`
- `subscribeStoredToken`
- `getStoredTokenSnapshot`

On mount, it runs `clearSessionIfExpired()` so stale tokens are removed.

It exposes:
- `token`
- `login(payload)`
- `logout()`
- `loginMutation` state (pending/error/success)

## 5) API request flow (frontend -> backend)

All browser API calls go to this Next app first, then proxy upstream:

1. UI/hooks call services (e.g. `*.service.ts`)
2. Services call frontend API paths (through axios/http wrappers)
3. Next route handler receives request at:
   - `src/app/api/billing-backend/[[...path]]/route.ts`
4. Handler resolves backend base URL via `getServerApiBaseUrl()`
5. Handler forwards request with `proxyRequestToUrl()`
6. Laravel billing backend responds
7. Response returns to UI/query cache

This keeps browser traffic consistent and centralizes backend forwarding rules.

## 6) Page-level module flow

Most feature pages follow this pattern:

1. Route page file under `src/app/(app)/.../page.tsx`
2. Renders a view component from `src/components/views/*`
3. View:
   - manages URL-synced filters/sort/page/per-page
   - calls domain hooks (React Query)
   - wires actions (create/edit/delete/view)
4. Table/modal components render UI and actions
5. Mutations invalidate/refetch queries and show toasts

## 7) Data architecture pattern

Standard layering used across domains:

- `models/*.ts`: API/domain types
- `services/*.service.ts`: API calls per domain
- `hooks/<domain>/*.ts`: query/mutation hooks
- `components/views/*`: page orchestration
- `components/<domain>/*`: domain UI (tables, forms, modals)

## 8) Universal table flow (current)

List screens now share table infrastructure:

- `src/components/crud/UniversalDataTable.tsx`
  - generic columns
  - actions
  - pagination + per-page controls
  - empty state
  - raw API response viewer

List UIs use:
- `CollapsibleFilterPanel` (toggle filters)
- `UniversalDataTable` (table rendering)

This keeps list behavior and look consistent across invoices, companies, customers, products, vendors, categories, currencies, and generic CRUD list pages.

## 9) URL state and shareable lists

CRUD views commonly:
- parse initial state from query params
- debounce search
- rebuild URL query string on filter/sort/page changes

This gives:
- bookmarkable list state
- back/forward browser support
- shareable filtered links

## 10) Practical request lifecycle example (Invoices)

1. User opens `/invoices`
2. `InvoiceCrudView` parses URL state
3. It builds query params and calls `useInvoices(...)`
4. Hook calls invoices service -> proxy route -> backend
5. Data is cached by React Query
6. `InvoiceListTable` renders rows via `UniversalDataTable`
7. User changes page/per-page/filter -> URL + query refetch update
8. User edits/deletes -> mutation runs -> toast shown -> list refreshes

## 11) Key files to understand first

- `src/app/layout.tsx`
- `src/components/providers/AppProviders.tsx`
- `src/contexts/auth-context.tsx`
- `src/components/layout/AppShell.tsx`
- `src/app/api/billing-backend/[[...path]]/route.ts`
- `src/components/views/*CrudView.tsx`
- `src/components/crud/UniversalDataTable.tsx`
- `src/lib/navigation/appPaths.ts`

---

For backend/proxy/auth environment details, also read:
- `docs/PROJECT-OVERVIEW.md`
