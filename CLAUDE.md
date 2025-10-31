# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Database
```bash
# Push schema changes to database (after modifying shared/schema.ts)
npm run db:push

# Seed demo data (creates demo user, cards, loans, and budgets)
npx tsx server/seed.ts
```

### Development
```bash
# Start dev server (frontend + backend on port 5000)
npm run dev

# Type checking
npm run check

# Build for production
npm run build

# Start production server
npm start
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 + TypeScript, Wouter (routing), TanStack Query (data fetching), Shadcn UI + Tailwind CSS
- **Backend**: Express.js + TypeScript, Drizzle ORM (type-safe database operations)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect) with Passport.js and PostgreSQL session storage

### Project Structure
```
client/src/          # Frontend React application
  components/        # Business components (AddIncomeDialog, CardsList, etc.)
  components/ui/     # Shadcn UI components (button, dialog, form, etc.)
  hooks/            # Custom React hooks (useAuth, use-toast)
  lib/              # Utilities (authUtils, currency, dateUtils, queryClient)
  pages/            # Route pages (landing, home, settings)
server/             # Backend Express application
  index.ts          # Server entry point with middleware setup
  routes.ts         # API endpoint definitions
  storage.ts        # Database operations (IStorage interface + implementation)
  db.ts             # Drizzle database connection
  replitAuth.ts     # Replit authentication setup
  seed.ts           # Database seeding script
shared/
  schema.ts         # Drizzle schema definitions (tables, relations, types)
```

### Data Model

The application uses a relational database with the following key tables:
- **users**: User accounts with currency preferences
- **credit_cards**: User's credit cards with statement/due day tracking
- **card_statements**: Monthly statements per card (totalDue, minimumDue, availableLimit)
- **loans**: Recurring loan installments
- **budgets**: Monthly budget containers (year/month)
- **incomes**: Income items linked to budgets (with recurring flag, status)
- **expenses**: Expense items with three kinds: REGULAR, CARD_BILL (linked to card statements), LOAN (linked to loans)

All monetary values use `decimal(12, 2)` for precision. The schema uses proper foreign key relationships with cascade deletes.

### Authentication Flow
1. User hits landing page → clicks "Get Started"
2. Redirects to Replit Auth (OpenID Connect)
3. On success, user info stored in `users` table
4. Session stored in PostgreSQL via connect-pg-simple
5. `isAuthenticated` middleware protects all `/api/*` routes (except auth endpoints)
6. User ID available via `req.user.claims.sub`

### Budget Calculation Logic

The core financial calculations are performed server-side in storage.ts:getBudget():

```typescript
// Total income from all income items
incomeTotal = sum(incomes.amount)

// Total due across all card statements for the month
cardsTotal = sum(cardStatements.totalDue)

// Non-card expenses (REGULAR + LOAN expenses)
nonCardExpensesTotal = sum(expenses.amount where kind != CARD_BILL)

// Remaining after paying all cards
afterCardPayments = incomeTotal - cardsTotal

// How much cash is needed (0 if afterCardPayments covers expenses)
need = max(0, nonCardExpensesTotal - afterCardPayments)
```

These totals are returned with every budget GET request and displayed as KPI cards on the dashboard.

### Credit Card Cycle Prediction

Credit cards store `statementDay`, `dueDay`, and `dayDifference` (days between statement and due date). When creating next month's budget, the system:
1. Predicts statement date: next occurrence of `statementDay` in target month
2. Calculates due date by adding `dayDifference` to statement date
3. Handles edge cases where due date falls into next month (e.g., statement on 28th + 10 day difference = due on 7th of next month)

See storage.ts:createNextMonthBudget() for implementation details.

### Cash-Out Planner

The cash-out planner helps users decide how much to withdraw from each credit card:
1. Displays the calculated `need` amount
2. Shows all cards with `availableLimit` from their current month statements
3. User adjusts sliders to select withdrawal amounts per card
4. On apply: Creates REGULAR expenses with label "Cash-out – {CardNickname}"
5. These expenses reduce the calculated `need` when budget is recalculated

The planner uses a smart suggestion algorithm (prioritizes cards with later due dates, then larger limits).

### Recurring Items

Income and expense items can be marked as `isRecurring`. Loans are always recurring. When creating next month:
1. Copies all recurring income items
2. Copies all recurring expenses (REGULAR only)
3. Automatically includes all active loans as LOAN expenses
4. Predicts new card statement dates for all cards

## Design Guidelines

This application follows a **mobile-first, fintech-inspired design**. Key principles from design_guidelines.md:

### Touch Targets
- All interactive elements: **min-h-12 (48px)** for mobile touch
- Icon buttons: w-12 h-12 square minimum
- Form inputs: h-12 with px-4 py-3 padding

### Typography
- Currency amounts: **always use font-mono and font-semibold**
- Labels: 0.75rem uppercase with tracking-wide
- Headings: H1 (2.5rem), H2 (1.875rem), H3 (1.5rem), H4 (1.25rem)

### Layout
- Responsive grids: 1 column mobile → 2 columns tablet → 4 columns desktop
- Spacing primitives: 2, 3, 4, 6, 8, 12, 16, 20 (Tailwind units)
- Card padding: p-6, section spacing: p-8 on desktop

### Components
- KPI cards: Display large monospaced numbers with labels and context
- Status badges: Pill shape (rounded-full), uppercase text
- Month switcher: Centered with left/right arrows
- Forms: Stack vertically on mobile, 2-column grid on desktop where appropriate

### Footer
Every page displays: **"A product by DEVPOOL."** (center-aligned, border-top separator)

## API Patterns

All API routes follow RESTful conventions:

### Authentication Required
All routes except `/api/login` and `/api/logout` require authentication. User ID is extracted from session via `req.user.claims.sub`.

### Response Format
- Success: Return data object directly or wrapped in object (e.g., `{ cards: [...] }`)
- Error: Return `{ message: "Error description" }` with appropriate status code

### Common Status Codes
- 200: Success
- 400: Bad request (missing/invalid parameters)
- 401: Unauthorized (not authenticated)
- 500: Internal server error

### Key Endpoints
- GET `/api/budgets/:year/:month` - Returns budget with all related data (incomes, expenses, card statements, loans, totals)
- POST `/api/budgets/:year/:month/create-next` - Creates next month with recurring items and predicted card dates
- POST `/api/budgets/:year/:month/cash-out` - Applies cash-out plan (creates expenses)
- PATCH `/api/incomes/:id/status` - Toggle status between pending/done
- PATCH `/api/expenses/:id/status` - Toggle status between pending/done

## Multi-Currency Support

Users can select from 20+ currencies (ISO 4217 codes). Currency formatting is handled client-side:

- Currency code stored in users.currencyCode (default: 'PKR')
- Formatting utility: client/src/lib/currency.ts exports `formatCurrency(amount, currencyCode)`
- Displays proper symbols, thousands separators, and decimal places
- All amounts stored as decimal in database (currency-agnostic)

## Testing & Demo Data

The seed script (server/seed.ts) creates a complete demo account:
- Demo user: demo@budgetnikal.com
- 2 credit cards with realistic Pakistani bank names
- 1 loan (Faysal Installment)
- September 2025 budget (completed with all items marked done)
- October 2025 budget (in progress with pending items)

This provides a full example of the application's functionality for testing and development.

## Common Pitfalls

1. **Date handling**: Always use date-fns utilities from client/src/lib/dateUtils.ts for consistent formatting
2. **Decimal arithmetic**: Use string-based decimal operations when necessary to avoid floating-point precision issues
3. **Session storage**: Ensure DATABASE_URL points to PostgreSQL instance with sessions table
4. **Card cycle calculation**: Account for month boundaries when calculating due dates (due date can fall in next month)
5. **Expense kinds**: Remember CARD_BILL expenses are auto-linked to card statements, LOAN expenses to loans - don't create these manually via Add Expense dialog
