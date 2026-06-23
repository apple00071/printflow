# PrintFlow Codebase Index

## Snapshot

- **Framework**: Next.js 14 App Router + React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Backend/Data**: Supabase Auth, Postgres, Storage, SSR helpers
- **Payments**: Razorpay subscriptions and webhook handling
- **Domain**: Multi-tenant printing-press management SaaS with a super-admin layer
- **Integrations**: Gmail auto-ingest sync, WASender WhatsApp messaging

## Top-Level Layout

- [app/](file:///d:/printflow/app/): App Router pages, layouts, and route handlers
- [components/](file:///d:/printflow/components/): Reusable UI, dashboard, and custom components
- [hooks/](file:///d:/printflow/hooks/): Custom React hooks (e.g., toast alerts)
- [lib/](file:///d:/printflow/lib/): Shared business logic, Supabase helpers, tenant/auth utilities, and printing parsers
- [public/](file:///d:/printflow/public/): Static assets (logos, icons)
- [supabase/](file:///d:/printflow/supabase/): Base schema, migrations, and storage setup SQL
- [middleware.ts](file:///d:/printflow/middleware.ts): Auth/session middleware entrypoint
- [package.json](file:///d:/printflow/package.json): Next app scripts and runtime dependencies

## Runtime Architecture

### 1. Public Marketing + Onboarding Surface

- [app/page.tsx](file:///d:/printflow/app/page.tsx): Large client-side landing page with bilingual marketing copy
- [app/login/page.tsx](file:///d:/printflow/app/login/page.tsx), [app/signup/page.tsx](file:///d:/printflow/app/signup/page.tsx), [app/register/page.tsx](file:///d:/printflow/app/register/page.tsx): Authentication entry flows
- [app/onboarding/page.tsx](file:///d:/printflow/app/onboarding/page.tsx): Tenant onboarding flow
- [app/order/page.tsx](file:///d:/printflow/app/order/page.tsx), [app/order/[slug]/page.tsx](file:///d:/printflow/app/order/[slug]/page.tsx): Public order-related tenant pages
- [app/shop/[slug]/page.tsx](file:///d:/printflow/app/shop/[slug]/page.tsx): Walk-in self-service storefront order intake page
- [app/proof/[orderId]/page.tsx](file:///d:/printflow/app/proof/[orderId]/page.tsx): Customer design proof review and approval portal
- [app/estimate/page.tsx](file:///d:/printflow/app/estimate/page.tsx): Public estimate UI

### 2. Tenant Dashboard Surface

- [app/dashboard/layout.tsx](file:///d:/printflow/app/dashboard/layout.tsx): Wraps all dashboard routes
- [components/dashboard/DashboardLayout.tsx](file:///d:/printflow/components/dashboard/DashboardLayout.tsx): Sidebar, navigation, language switcher, sign-out, and super-admin shortcuts
- [app/dashboard/page.tsx](file:///d:/printflow/app/dashboard/page.tsx): Dashboard metrics overview
- [app/dashboard/orders/*](file:///d:/printflow/app/dashboard/orders/): Order listings, details, creation, and edits
- [app/dashboard/customers/*](file:///d:/printflow/app/dashboard/customers/): Customer ledger list and detail pages
- [app/dashboard/quotations/*](file:///d:/printflow/app/dashboard/quotations/): Quotation creation, listings, and detail pages
- [app/dashboard/billing/*](file:///d:/printflow/app/dashboard/billing/): Billing dashboard, invoices, challan generators, and GST reports
- [app/dashboard/expenses/page.tsx](file:///d:/printflow/app/dashboard/expenses/page.tsx): Operational costs tracker
- [app/dashboard/inventory/page.tsx](file:///d:/printflow/app/dashboard/inventory/page.tsx): Raw material stock level manager
- [app/dashboard/tools/imposer/page.tsx](file:///d:/printflow/app/dashboard/tools/imposer/page.tsx): Interactive PDF booklet/N-up imposition utility
- [app/dashboard/settings/page.tsx](file:///d:/printflow/app/dashboard/settings/page.tsx): Tenant/business configuration panel
- [app/dashboard/profile/page.tsx](file:///d:/printflow/app/dashboard/profile/page.tsx), [app/dashboard/team/page.tsx](file:///d:/printflow/app/dashboard/team/page.tsx): Profile and staff team setup pages
- [app/debug/page.tsx](file:///d:/printflow/app/debug/page.tsx): Debug panel for viewing raw session states

### 3. Super-Admin Surface

- [app/admin/page.tsx](file:///d:/printflow/app/admin/page.tsx): Platform-wide admin dashboard
- [app/admin/analytics/page.tsx](file:///d:/printflow/app/admin/analytics/page.tsx): Platform usage analytics
- [app/admin/tenants/page.tsx](file:///d:/printflow/app/admin/tenants/page.tsx): Active tenant list and management controls
- [app/admin/tenants/[id]/page.tsx](file:///d:/printflow/app/admin/tenants/[id]/page.tsx): Individual tenant configuration page

### 4. API Route Handlers

- [app/api/admin/tenants/route.ts](file:///d:/printflow/app/api/admin/tenants/route.ts): List/create tenants and auth profiles
- [app/api/admin/tenants/[id]/route.ts](file:///d:/printflow/app/api/admin/tenants/[id]/route.ts): Tenant-specific admin actions
- [app/api/auth/google/login/route.ts](file:///d:/printflow/app/api/auth/google/login/route.ts) & [app/api/auth/google/callback/route.ts](file:///d:/printflow/app/api/auth/google/callback/route.ts): Google OAuth flow for Gmail integrations
- [app/api/integrations/gmail/sync/route.ts](file:///d:/printflow/app/api/integrations/gmail/sync/route.ts): Gmail email-to-order automatic ingest sync
- [app/api/orders/route.ts](file:///d:/printflow/app/api/orders/route.ts): Central API for inserting orders and preventing duplicates
- [app/api/tenant-data/route.ts](file:///d:/printflow/app/api/tenant-data/route.ts): Resolves current tenant context for signed-in users
- [app/api/tenant/orders/route.ts](file:///d:/printflow/app/api/tenant/orders/route.ts): Tenant-scoped orders endpoint
- [app/api/razorpay/checkout/route.ts](file:///d:/printflow/app/api/razorpay/checkout/route.ts): Razorpay subscription initiator
- [app/api/razorpay/webhook/route.ts](file:///d:/printflow/app/api/razorpay/webhook/route.ts): Subscription webhook receiver

## Data and Auth Layer

### Supabase Clients

- [lib/supabase/server.ts](file:///d:/printflow/lib/supabase/server.ts): Server-side SSR client using request cookies
- [lib/supabase/client.ts](file:///d:/printflow/lib/supabase/client.ts): Browser Supabase client
- [lib/supabase/admin.ts](file:///d:/printflow/lib/supabase/admin.ts): privileged operations client (uses service role key)
- [lib/supabase/middleware.ts](file:///d:/printflow/lib/supabase/middleware.ts): Refresh sessions and route-gating

### Request Gating

- [middleware.ts](file:///d:/printflow/middleware.ts) delegates to [lib/supabase/middleware.ts](file:///d:/printflow/lib/supabase/middleware.ts)
- Gated routes (`/dashboard`, `/admin`, `/onboarding`) redirect unauthorized requests
- Routing based on profile roles:
  - **Super Admin**: redirects to `/admin`
  - **Tenant Admin / Worker**: redirects to `/dashboard`
- Validates onboarding completion prior to allowing worker dashboard access

### Tenant Resolution

- [lib/tenant.ts](file:///d:/printflow/lib/tenant.ts):
  - `getCurrentTenant(...)` maps user profile to active tenant
  - `getTenantBySlug(...)` public storefront lookup by slug

### Super-Admin Detection

- [lib/superadmin.ts](file:///d:/printflow/lib/superadmin.ts): Validates if a user is super admin (`role = 'ADMIN'` and `tenant_id IS NULL`)

## Core Business Logic

### Orders, Quotations, Payments, Invitations

- [lib/supabase/actions.ts](file:///d:/printflow/lib/supabase/actions.ts) is the core backend logic orchestrator:
  - Order mutations, updates, and state transitions
  - Delivery challan assignments
  - Quotation insertions and calculations
  - Financial payment details and customer balance updates
  - Accepting tenant staff invitations

Key behaviors:
- Enforces strict tenant scoping
- Super admins can bypass scoping where required
- Creates missing customer cards on the fly from phone number
- Computes GST automatically during order mutations
- Generates billing references through Supabase RPC routines

### Printing Spec Parsing

- [lib/parser.ts](file:///d:/printflow/lib/parser.ts): Extract structured print job metadata (quantity, paper GSM, dimensions, sides, lamination, product type) from free-form instructions.

### WhatsApp Notification Delivery

- [lib/whatsapp.ts](file:///d:/printflow/lib/whatsapp.ts): Dispatches automated status updates (in-design, printing, ready, delivered, proof approval links) via the WASender API.

### GST and Billing Helpers

- [lib/gst.ts](file:///d:/printflow/lib/gst.ts): GST computations
- [lib/config.ts](file:///d:/printflow/lib/config.ts): Press default constants, business definitions, and GST properties
- [lib/utils.ts](file:///d:/printflow/lib/utils.ts): Shared utility logic (Indian number formatting `amountInWords`, slugify)
- [lib/utils/format.ts](file:///d:/printflow/lib/utils/format.ts): Presentation wrappers for local currency and dates

### Payments & Subscriptions

- [lib/razorpay.ts](file:///d:/printflow/lib/razorpay.ts): Subscription plan pricing rules and Razorpay wrapper
- [app/api/razorpay/webhook/route.ts](file:///d:/printflow/app/api/razorpay/webhook/route.ts): Updates subscription status based on payment events

## UI Components

### Shared UI

- [components/Logo.tsx](file:///d:/printflow/components/Logo.tsx): Product branding
- [components/ui/CustomDatePicker.tsx](file:///d:/printflow/components/ui/CustomDatePicker.tsx): Modern custom calendar picker
- [components/ui/CustomSelect.tsx](file:///d:/printflow/components/ui/CustomSelect.tsx): Dropdown input select fields
- [components/ui/Portal.tsx](file:///d:/printflow/components/ui/Portal.tsx): Portal wrapper for rendering outside normal DOM tree
- [components/ui/Toast.tsx](file:///d:/printflow/components/ui/Toast.tsx) & [hooks/useToast.ts](file:///d:/printflow/hooks/useToast.ts): Notification management
- [components/ui/ProductAutocomplete.tsx](file:///d:/printflow/components/ui/ProductAutocomplete.tsx): Smart autocomplete dropdown for product types

### Dashboard-Specific Components

- [components/dashboard/DashboardLayout.tsx](file:///d:/printflow/components/dashboard/DashboardLayout.tsx): Sidebar navigation layout wrapper
- [components/dashboard/DashboardCharts.tsx](file:///d:/printflow/components/dashboard/DashboardCharts.tsx): Charts for business intelligence reports
- [components/dashboard/AddPaymentModal.tsx](file:///d:/printflow/components/dashboard/AddPaymentModal.tsx): Ledger transaction insertion modal
- [components/dashboard/CommandPalette.tsx](file:///d:/printflow/components/dashboard/CommandPalette.tsx): Global search bar overlay (triggered via `Ctrl+K`)
- [components/dashboard/QuickJobForm.tsx](file:///d:/printflow/components/dashboard/QuickJobForm.tsx): Rapid order ingestion dashboard form
- [components/dashboard/GmailHistoryScanner.tsx](file:///d:/printflow/components/dashboard/GmailHistoryScanner.tsx): Inbox scanning utility for historical print orders
- [components/dashboard/OnboardingProgress.tsx](file:///d:/printflow/components/dashboard/OnboardingProgress.tsx): Interactive guided setup indicator
- [components/dashboard/ProfileSettings.tsx](file:///d:/printflow/components/dashboard/ProfileSettings.tsx): Personal settings controller
- [components/dashboard/TeamSettings.tsx](file:///d:/printflow/components/dashboard/TeamSettings.tsx): Employee invites panel

## Localization

- [lib/context/LanguageContext.tsx](file:///d:/printflow/lib/context/LanguageContext.tsx): Context store targeting `en` / `te` / `hi` (localStorage saved)
- [app/translations.ts](file:///d:/printflow/app/translations.ts): landing page strings

## Database Source of Truth

- [supabase/schema.sql](file:///d:/printflow/supabase/schema.sql): Initial baseline schema representation
- [supabase/storage-setup.sql](file:///d:/printflow/supabase/storage-setup.sql): Defines Supabase storage buckets and storage access rules

### Migrations Sequence

Migrations applied under [supabase/migrations/](file:///d:/printflow/supabase/migrations/):
1. [20260318_printflow_conversion.sql](file:///d:/printflow/supabase/migrations/20260318_printflow_conversion.sql): Adds multi-tenancy columns, scopes, and RLS rules.
2. [20260322_add_actual_delivery.sql](file:///d:/printflow/supabase/migrations/20260322_add_actual_delivery.sql): Tracks exact order completion dates.
3. [20260403_add_quotations_and_challans.sql](file:///d:/printflow/supabase/migrations/20260403_add_quotations_and_challans.sql): Introduces delivery challans, invoices, and quotation workflows.
4. [20260403125245_change_quantity_type.sql](file:///d:/printflow/supabase/migrations/20260403125245_change_quantity_type.sql): Alters type parameters for order counts.
5. [20260403131500_add_cascade_delete_tenants.sql](file:///d:/printflow/supabase/migrations/20260403131500_add_cascade_delete_tenants.sql): Cascade triggers on deleted tenants.
6. [20260403132000_add_printing_date_remove_finishing.sql](file:///d:/printflow/supabase/migrations/20260403132000_add_printing_date_remove_finishing.sql): Updates schema definition for scheduled printing activities.
7. [20260403133000_fix_customer_uniqueness.sql](file:///d:/printflow/supabase/migrations/20260403133000_fix_customer_uniqueness.sql): Relaxes constraints to allow the same customer phone number across distinct tenants.
8. [20260407_expenses_inventory.sql](file:///d:/printflow/supabase/migrations/20260407_expenses_inventory.sql): Creates operational expenses and stock inventory schema tables.
9. [20260407_auto_inventory_deduction.sql](file:///d:/printflow/supabase/migrations/20260407_auto_inventory_deduction.sql): Automatically updates inventory balances when print orders are fulfilled.
10. [20260407_proofing_workflow.sql](file:///d:/printflow/supabase/migrations/20260407_proofing_workflow.sql): Appends fields for customer-facing proof tokens and approval flags.
11. [20260408_add_printing_details.sql](file:///d:/printflow/supabase/migrations/20260408_add_printing_details.sql): Registers standard print properties (gsm, sides, dimensions) in the database.
12. [20260408_fix_inventory_trigger.sql](file:///d:/printflow/supabase/migrations/20260408_fix_inventory_trigger.sql): Resolves automatic stock deduction trigger bugs.
13. [20260408_public_portal_permissions.sql](file:///d:/printflow/supabase/migrations/20260408_public_portal_permissions.sql): Grants public RLS permissions for storefront order and proof portals.
14. [20260416_add_tenant_id_prefix.sql](file:///d:/printflow/supabase/migrations/20260416_add_tenant_id_prefix.sql): Scopes sequential, friendly invoice numbers using custom tenant prefixes.
15. [20260515_add_gmail_message_id.sql](file:///d:/printflow/supabase/migrations/20260515_add_gmail_message_id.sql): Maps orders to Gmail identifiers to avoid duplicate creation from background scans.
16. [20260515_add_sync_order_prefixes.sql](file:///d:/printflow/supabase/migrations/20260515_add_sync_order_prefixes.sql): Maps order tracking sequence rules for sync mechanisms.
