# Project Instructions — Printing Press Management App

## Project Overview
This is a full-stack web application for a printing press business 
in Chirala, Andhra Pradesh, India. It handles order management, 
billing, customer tracking, and staff workflows.

## Business Context
- Business type: Local printing press
- Location: Chirala, Andhra Pradesh
- Primary users: Owner (admin), press workers, and walk-in / 
  returning customers
- Primary language: English UI with Telugu labels on key sections
- All amounts in Indian Rupees (₹)
- Date format: DD/MM/YYYY

## Tech Stack — Do Not Change
- Framework: Next.js 14 with App Router
- Database: Supabase (PostgreSQL)
- Auth: Supabase Auth (email + password)
- ORM: Prisma (connected to Supabase)
- Styling: Tailwind CSS only — no other CSS frameworks
- Charts: Recharts
- Deployment: Vercel via GitHub
- File storage: Supabase Storage

## Folder Structure to Follow
app/
  (auth)/login/         → login page
  (dashboard)/          → protected routes
    dashboard/          → admin home
    orders/             → order list + create + detail
    customers/          → customer list + detail
    billing/            → payments and invoices
    settings/           → price table editor, staff management
  order/                → public order form (no login)
  estimate/             → public price estimator (no login)
components/
  ui/                   → reusable UI components
  dashboard/            → dashboard-specific components
  orders/               → order-specific components
lib/
  supabase/             → supabase client (browser + server)
  prisma/               → prisma client instance
  utils/                → helper functions (currency, dates)
prisma/
  schema.prisma

## Environment Variables Required
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
DIRECT_URL

## Key Business Rules
- Every order must have a customer (auto-create if new phone number)
- Balance due = total amount - advance paid (always auto-calculated)
- An order cannot move to DELIVERED without full payment or 
  explicit admin override
- File uploads go to Supabase Storage bucket called "order-files"
- WhatsApp notifications are deep links only — no external API
- Price estimator reads from PriceTable in DB, not hardcoded values
- Admin can see and edit all orders
- Workers can only see orders assigned to them and update status only