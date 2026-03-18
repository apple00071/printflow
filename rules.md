# Agent Rules — Printing Press App

## Code Quality
- Always use TypeScript — no plain JavaScript files
- Use async/await — never .then() chains
- Handle all errors with try/catch and show user-friendly 
  error messages in the UI
- Never expose SUPABASE_SERVICE_ROLE_KEY to the client side
- Use server actions or API routes for all DB writes — 
  never write to DB directly from client components

## Supabase Rules
- Use the server-side Supabase client for all protected routes 
  and server actions
- Use the browser Supabase client only for auth state on client 
  components
- Always check user session in middleware before serving 
  dashboard routes
- Row Level Security (RLS): enable on all tables in Supabase.
  Workers can only SELECT orders where assignedToId = their user id.
  Admins have full access via service role key on server only.

## Prisma Rules
- Always use a single shared PrismaClient instance from lib/prisma
- Never call prisma directly in a React component — 
  only in server actions or route handlers
- After any schema change, run: prisma db push
- Use prisma.$transaction for any multi-table writes 
  (e.g. creating order + updating customer balance together)

## UI Rules
- Mobile-first — design for 375px screen width first
- Use Tailwind utility classes only — no custom CSS files
- Color tokens to use consistently:
    Primary:   #1e3a5f (deep blue)
    Accent:    #f97316 (orange)
    Success:   #16a34a (green)
    Warning:   #ca8a04 (yellow)
    Danger:    #dc2626 (red)
    Muted:     #6b7280 (gray)
- All forms must have loading states on submit buttons
- All data tables must have empty states 
  (e.g. "No orders yet / ఇంకా ఆర్డర్లు లేవు")
- Show toast notifications for all create / update / delete actions
- All currency values rendered as: ₹1,234.00

## Git Rules
- Commit after each major feature is complete
- Commit message format: feat: add [feature name]
- Never commit .env.local
- Always update .gitignore before first commit

## Deployment Rules
- All environment variables must be added to Vercel dashboard 
  before deploying
- Add postinstall script in package.json: "prisma generate"
- Test build locally with: next build before pushing to main
- Main branch = production on Vercel (auto-deploy on push)

## Do Not
- Do not use any third-party UI libraries (no shadcn, no MUI, 
  no Chakra) — Tailwind only
- Do not use getServerSideProps or pages router patterns — 
  App Router only
- Do not hardcode any business name, phone number, or address — 
  keep them in a config file: lib/config.ts
- Do not create separate CSS files — Tailwind classes only
- Do not skip loading and error states on any async operation

## Supabase Direct Client Rules
- NEVER use Prisma — Supabase client only throughout
- Use createClient from lib/supabase/server.ts in:
  server components, server actions, route handlers
- Use createClient from lib/supabase/client.ts in:
  client components (auth state only)
- Use admin client from lib/supabase/admin.ts in:
  webhooks and service-role operations only —
  never import on client side
- Always include tenant_id in every INSERT and 
  WHERE clause — no exceptions
- Use Supabase RPC for atomic operations 
  (invoice number generation)
- Never write raw SQL in components — 
  use lib/tenant.ts and lib/gst.ts helpers

## GST Rules
- All GST calculations in lib/gst.ts only — 
  never inline in components
- Invoice numbers generated via Supabase RPC only —
  never generate in application code
- Validate GSTIN before every save
- Always auto-detect inter-state from 
  customer.state vs tenant.gst_state
- amountInWords must use Indian system 
  (lakhs/crores not millions/billions)
- GST reports and CSV export = Pro plan only
- Use window.print() for PDF — no external libraries