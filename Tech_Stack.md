🏗️ COMPLETE APPLICATION ARCHITECTURE

  📱 FRONTEND STACK

  Core Technologies

  - Language: TypeScript 5.6.3
  - Framework: React 18.3.1
  - Build Tool: Vite 5.4.20 (fast, modern build tool)
  - Bundler: esbuild 0.25.0 (for API serverless functions)

  UI & Styling

  - CSS Framework: Tailwind CSS 4.1.3
  - UI Components: Shadcn UI (built on Radix UI primitives)
    - 40+ Radix UI components (Dialog, Select, Dropdown, etc.)
    - Custom styled with Tailwind + class-variance-authority
  - Icons: Lucide React (453+ icons)
  - Animations: Framer Motion 11.13.1 + tailwindcss-animate

  State Management & Data Fetching

  - Server State: TanStack Query (React Query) 5.60.5
    - Handles all API calls, caching, invalidation
    - Auto-refetch on window focus
    - Optimistic updates
  - Form State: React Hook Form 7.55.0
  - Validation: Zod 3.24.2
  - Routing: Wouter 3.3.5 (lightweight React router)

  Key Libraries

  - Drag & Drop: @dnd-kit/core + @dnd-kit/sortable (for reordering lists)
  - Date Handling: date-fns 3.6.0
  - Currency Formatting: Custom lib (supports 20+ currencies)
  - Theme: next-themes 0.4.6 (dark/light mode)

  ---
  🖥️ BACKEND STACK

  Core Technologies

  - Language: TypeScript 5.6.3
  - Runtime: Node.js 20.16.11
  - Framework: Express.js 4.21.2
  - Build: tsx 4.20.5 (for development)

  Database Layer

  - Database: PostgreSQL (Supabase hosted)
  - ORM: Drizzle ORM 0.39.3
    - Type-safe SQL queries
    - Automatic TypeScript types from schema
    - Zero-cost abstractions
  - Migration Tool: drizzle-kit 0.31.4
  - Database Client: node-postgres (pg) 8.16.3
  - Connection Pool: Supabase Pooled Connection (port 6543)

  Authentication

  - Provider: Supabase Auth (@supabase/supabase-js 2.78.0)
  - Session Management: express-session 1.18.1
  - Session Store: PostgreSQL (connect-pg-simple 10.0.0)
  - Security:
    - HTTP-only cookies
    - Session TTL: 7 days
    - Access/Refresh token rotation

  Middleware

  - Passport.js 0.7.0 (authentication middleware)
  - OpenID Connect client 6.8.1
  - Express session store in PostgreSQL

  ---
  🗄️ DATABASE SCHEMA

  Tables (PostgreSQL)

  1. sessions - Express session storage
  2. users - User accounts (from Supabase Auth)
  3. credit_cards - Credit card details
  4. card_statements - Monthly statements per card
  5. loans - Recurring loan installments
  6. budgets - Monthly budget containers
  7. incomes - Income items (linked to budgets)
  8. expenses - Expense items (3 types: REGULAR, CARD_BILL, LOAN)

  Relationships

  - User → Many Credit Cards
  - User → Many Loans
  - User → Many Budgets
  - Budget → Many Incomes
  - Budget → Many Expenses
  - Credit Card → Many Statements
  - Expense → Optional Link to Card Statement or Loan

  ---
  ☁️ DEPLOYMENT (PRODUCTION)

  Frontend Hosting: Vercel

  - Build: Vite production build
  - Output: Static files in dist/public
  - CDN: Vercel Edge Network (global)
  - Domain: Custom domain support
  - SSL: Automatic HTTPS

  Backend Hosting: Vercel Serverless Functions

  - File: api/handler.ts (bundled to api/bundled.js)
  - Runtime: Node.js serverless function
  - Max Duration: 10 seconds
  - API Routes: All /api/* requests → serverless function
  - Rewriting: Vercel rewrites API calls to serverless handler

  Database: Supabase PostgreSQL

  - Hosting: Supabase Cloud
  - Connection: Pooled connection (pgbouncer, port 6543)
  - SSL: Required (rejectUnauthorized: false)
  - Features:
    - Automatic backups
    - Connection pooling
    - Built-in auth system

  Environment Variables (Production)

  DATABASE_URL=postgresql://... (Supabase pooled)
  SUPABASE_URL=https://...supabase.co
  SUPABASE_ANON_KEY=...
  SESSION_SECRET=...
  NODE_ENV=production

  ---
  🔄 HOW IT WORKS

  Development Mode (Local)

  npm run dev
  1. Frontend: Vite dev server (Hot Module Replacement)
  2. Backend: server/index.ts runs Express server
  3. Auth: Dev bypass mode (auto-login as demo user)
  4. Database: Connects to Supabase PostgreSQL
  5. File Used: server/routes.ts

  Production Mode (Vercel)

  npm run build

  Build Process:
  1. Frontend:
    - Vite bundles React app → dist/public (static files)
    - Optimized, minified, tree-shaken
  2. Backend:
    - esbuild bundles api/handler.ts → api/bundled.js
    - Includes all dependencies (except externals)
    - Deploys as Vercel Serverless Function

  Runtime:
  1. User visits https://your-domain.com
  2. Vercel serves static frontend from CDN
  3. Frontend makes API calls to /api/*
  4. Vercel routes to serverless function
  5. Function connects to Supabase PostgreSQL
  6. Data returned to frontend
  7. React Query caches response

  ---
  📡 API ARCHITECTURE

  Request Flow

  Client (React)
    ↓ (TanStack Query)
  API Call to /api/budgets/2025/11
    ↓ (Vercel Rewrite)
  Serverless Function (api/handler.ts)
    ↓ (isAuthenticated middleware)
  Check Supabase Auth Session
    ↓ (if valid)
  Execute Route Handler
    ↓ (Drizzle ORM)
  Query Supabase PostgreSQL
    ↓
  Return JSON Response
    ↓ (React Query)
  Update UI + Cache

  Authentication Flow

  1. User signs up → Supabase Auth
  2. Session stored in PostgreSQL sessions table
  3. Access/refresh tokens in HTTP-only cookie
  4. Every API call → isAuthenticated middleware
  5. Middleware validates token with Supabase
  6. Auto-refresh expired tokens
  7. Store user data in users table

  ---
  📊 KEY FEATURES & LOGIC

  Budget Calculations

  - Income Total: Sum of all income amounts
  - Paid Income: Only income marked as "DONE"
  - Cards Total: Sum of all CARD_BILL expenses
  - Balance: Paid Income - Paid Expenses
  - After Cards: Income Total - Cards Total
  - Cash Needed: Max(0, Non-Card Expenses - After Cards)

  Credit Card Cycle Prediction

  - Stores statementDay, dueDay, dayDifference
  - Auto-creates statements when viewing months
  - Calculates due dates across month boundaries
  - Updates availableLimit based on totalDue + cashouts

  Cash-Out Planner

  - Suggests withdrawal amounts from cards
  - Prioritizes cards with later due dates
  - Creates income items: "Cash-out – {CardName}"
  - Reduces "Need" calculation

  Recurring Items

  - Income/Expenses can be marked recurring
  - Auto-copied to future months
  - Loans always recurring
  - Copied when creating next month

  ---
  🚀 DEPLOYMENT FILES

  Local Dev

  - server/index.ts - Express server entry
  - server/routes.ts - API route handlers

  Production (Vercel)

  - api/handler.ts - Serverless function handler
  - vercel.json - Deployment configuration
  - dist/public - Built frontend
  - api/bundled.js - Bundled serverless function

  ---
  📦 TOTAL TECH STACK SUMMARY

  | Category           | Technology            |
  |--------------------|-----------------------|
  | Language           | TypeScript            |
  | Frontend Framework | React 18              |
  | Build Tool         | Vite                  |
  | CSS                | Tailwind CSS          |
  | UI Components      | Shadcn UI (Radix UI)  |
  | State Management   | TanStack Query        |
  | Forms              | React Hook Form + Zod |
  | Routing            | Wouter                |
  | Backend Framework  | Express.js            |
  | Database           | PostgreSQL (Supabase) |
  | ORM                | Drizzle ORM           |
  | Authentication     | Supabase Auth         |
  | Session Store      | PostgreSQL            |
  | Frontend Hosting   | Vercel                |
  | Backend Hosting    | Vercel Serverless     |
  | Database Hosting   | Supabase Cloud        |