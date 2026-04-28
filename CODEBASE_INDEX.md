# PrintFlow Codebase Index

## Snapshot

- Framework: Next.js 14 App Router + React 18 + TypeScript
- Styling: Tailwind CSS
- Backend/data: Supabase Auth, Postgres, Storage, SSR helpers
- Payments: Razorpay subscriptions and webhook handling
- Domain: Multi-tenant printing-press management SaaS with a super-admin layer

## Top-Level Layout

- `app/`: App Router pages, layouts, and route handlers
- `components/`: Reusable UI and dashboard components
- `lib/`: Shared business logic, Supabase helpers, tenant/auth utilities
- `supabase/`: Base schema, migrations, and storage setup SQL
- `middleware.ts`: Auth/session middleware entrypoint
- `package.json`: Next app scripts and runtime dependencies

## Runtime Architecture

### 1. Public marketing + onboarding surface

- `app/page.tsx`: Large client-side landing page with bilingual marketing copy
- `app/login/page.tsx`, `app/signup/page.tsx`, `app/register/page.tsx`: auth entry flows
- `app/onboarding/page.tsx`: tenant onboarding flow
- `app/order/page.tsx`, `app/order/[slug]/page.tsx`: public order-related tenant pages
- `app/estimate/page.tsx`: estimate UI

### 2. Tenant dashboard surface

- `app/dashboard/layout.tsx`: wraps all dashboard routes
- `components/dashboard/DashboardLayout.tsx`: sidebar, nav, language switch, sign-out, super-admin shortcut
- `app/dashboard/page.tsx`: dashboard overview
- `app/dashboard/orders/*`: order listing, details, create, edit
- `app/dashboard/customers/*`: customer listing and detail pages
- `app/dashboard/quotations/*`: quotation list, create, detail
- `app/dashboard/billing/*`: billing dashboard, invoice pages, challan pages, GST reports
- `app/dashboard/settings/page.tsx`: tenant/business configuration
- `app/dashboard/profile/page.tsx`, `app/dashboard/team/page.tsx`: profile/team settings entry pages

### 3. Super-admin surface

- `app/admin/page.tsx`: super-admin dashboard
- `app/admin/analytics/page.tsx`: platform analytics
- `app/admin/tenants/page.tsx`: tenant management list
- `app/admin/tenants/[id]/page.tsx`: tenant detail/management page

### 4. API route handlers

- `app/api/admin/tenants/route.ts`: list/create tenants, create auth user + profile
- `app/api/admin/tenants/[id]/route.ts`: tenant-specific admin actions
- `app/api/tenant-data/route.ts`: current tenant fetch for logged-in tenant user
- `app/api/tenant/orders/route.ts`: tenant order API endpoint
- `app/api/razorpay/checkout/route.ts`: subscription checkout bootstrap
- `app/api/razorpay/webhook/route.ts`: subscription event ingestion

## Data and Auth Layer

### Supabase clients

- `lib/supabase/server.ts`: server-side SSR client using request cookies
- `lib/supabase/client.ts`: browser Supabase client
- `lib/supabase/admin.ts`: service-role/admin client for privileged operations
- `lib/supabase/middleware.ts`: session refresh and route gating

### Request gating

- `middleware.ts` delegates to `lib/supabase/middleware.ts`
- Unauthenticated users are redirected away from `/dashboard`, `/admin`, and `/onboarding`
- Authenticated users are redirected by role:
  - super admin: `/admin`
  - tenant admin/worker: `/dashboard`
- Workers are also checked for tenant onboarding completion

### Tenant resolution

- `lib/tenant.ts`:
  - `getCurrentTenant(...)`: resolves current user -> profile -> tenant
  - `getTenantBySlug(...)`: public tenant lookup

### Super-admin detection

- `lib/superadmin.ts`: a user is treated as super admin when `profiles.role = 'ADMIN'` and `tenant_id IS NULL`

## Core Business Logic

### Orders, quotations, payments, invitations

- `lib/supabase/actions.ts` is the main business-logic hub:
  - order create/read/update/status transitions
  - challan assignment
  - quotation create/read/update
  - payment insertion + order advance updates
  - team invitation lookup/accept flow

Important behavior in `lib/supabase/actions.ts`:

- tenant scoping is enforced for normal users
- super admins can bypass tenant scoping in some flows
- customers are auto-created from phone number when missing
- GST is calculated during create/update
- invoice and challan numbers come from Supabase RPC functions

### GST and billing helpers

- `lib/gst.ts`: GST calculations
- `lib/config.ts`: printing-press defaults, GST defaults, business info constants
- `lib/utils/format.ts`: formatting helpers

### Payments/subscriptions

- `lib/razorpay.ts`: lazy Razorpay client + plan metadata
- `app/api/razorpay/webhook/route.ts`: updates tenant subscription state from Razorpay events

## UI Components

### Shared

- `components/Logo.tsx`: product branding
- `components/ui/CustomDatePicker.tsx`
- `components/ui/CustomSelect.tsx`

### Dashboard-specific

- `components/dashboard/DashboardLayout.tsx`: shell/navigation
- `components/dashboard/DashboardCharts.tsx`: reporting visuals
- `components/dashboard/AddPaymentModal.tsx`: payment entry
- `components/dashboard/ProfileSettings.tsx`
- `components/dashboard/TeamSettings.tsx`

## Localization

- `lib/context/LanguageContext.tsx`: client context storing `en`/`te` in `localStorage`
- `app/translations.ts`: landing-page translation content
- Dashboard components commonly call `t(english, telugu)` from the language context

Note:

- Some Telugu strings currently appear mojibake-encoded in source, which is worth checking before making localization edits.

## Database Source of Truth

### Base schema

- `supabase/schema.sql`: early single-tenant-ish baseline schema

### Migrations that matter more for current app behavior

- `supabase/migrations/20260318_printflow_conversion.sql`
  - adds `tenants`
  - adds `tenant_id` columns across core tables
  - adds GST fields
  - enables tenant-aware RLS
  - defines `generate_invoice_number(...)`
  - adds storage bucket/policies
- `supabase/migrations/20260322_add_actual_delivery.sql`
  - adds `orders.actual_delivery_date`

Important caution:

- The application code clearly expects the migrated multi-tenant schema, not just `supabase/schema.sql`.
- There is naming drift between older SQL and newer application code, especially around:
  - `plan` vs `subscription_tier`
  - `plan_status` vs `subscription_status`
- When debugging data issues, verify the live database columns before trusting the older schema file.

## Notable Hotspots

### Large page files

These files are substantial and likely carry both UI and business logic:

- `app/page.tsx`
- `app/admin/page.tsx`
- `app/admin/tenants/page.tsx`
- `app/dashboard/orders/new/page.tsx`
- `app/dashboard/orders/edit/[id]/page.tsx`
- `app/dashboard/orders/[id]/page.tsx`
- `app/dashboard/quotations/new/page.tsx`
- `app/dashboard/settings/page.tsx`

### Files to inspect first for common tasks

- Auth/redirect issue: `middleware.ts`, `lib/supabase/middleware.ts`, `lib/superadmin.ts`
- Tenant scoping issue: `lib/tenant.ts`, `lib/supabase/actions.ts`
- Billing/GST issue: `lib/gst.ts`, billing pages, SQL migrations
- Subscription issue: `lib/razorpay.ts`, `app/api/razorpay/*`
- Admin tenant issue: `app/api/admin/tenants/route.ts`

## Practical Entry Points For New Work

### Add a dashboard feature

1. Find the route under `app/dashboard/...`
2. Check whether data is fetched via `lib/supabase/actions.ts` or directly from Supabase
3. Reuse `components/dashboard/*` where possible

### Add a new tenant-aware table/feature

1. Add/update a Supabase migration in `supabase/migrations/`
2. Include `tenant_id` and RLS policy design
3. Add helper logic in `lib/*` or `lib/supabase/actions.ts`
4. Wire the page/API route

### Modify auth or role routing

1. Start in `lib/supabase/middleware.ts`
2. Cross-check with `lib/superadmin.ts`
3. Verify profile shape in Supabase

## Current Documentation Quality

- `README.md` is still the default Next.js starter and does not describe this product
- This file is the more accurate starting point for onboarding until the README is rewritten
