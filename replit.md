# Budget Nikal

## Overview

Budget Nikal is a mobile-first budget management application designed for tracking income, expenses, credit card cycles, and loans. The application features intelligent credit card statement prediction, cash-out planning to optimize card withdrawals, and comprehensive monthly budget tracking. Built with a focus on clarity and ease of use, it helps users manage their finances through automated cycle tracking and smart withdrawal suggestions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR and optimized builds
- Wouter for client-side routing (lightweight alternative to React Router)
- Mobile-first responsive design using Tailwind CSS with custom design system

**State Management**
- TanStack Query (React Query) for server state management and caching
- Local component state with React hooks for UI state
- Query invalidation pattern for automatic data synchronization after mutations

**UI Component Library**
- Radix UI primitives for accessible, unstyled components
- shadcn/ui component system built on Radix UI with Tailwind styling
- Custom components following design guidelines in `design_guidelines.md`
- Inter font family for consistent typography
- Mobile-optimized touch targets and interactions

**Form Handling**
- React Hook Form with Zod resolvers for form validation
- Dialog-based forms for adding income, expenses, cards, and loans
- Client-side validation before API submission

**Data Formatting**
- ISO 4217 multi-currency support with proper symbols and formatting
- date-fns for date manipulation and formatting
- Custom utility functions for currency display and date calculations

### Backend Architecture

**Server Framework**
- Express.js with TypeScript for RESTful API endpoints
- Session-based authentication using express-session
- Route handler pattern in `server/routes.ts` for API organization

**Authentication System**
- Replit OpenID Connect (OIDC) integration via Passport.js
- Session storage in PostgreSQL using connect-pg-simple
- User isolation - all data queries filtered by authenticated user ID
- Automatic token refresh handling

**Database Layer**
- Drizzle ORM for type-safe database operations
- Neon serverless PostgreSQL as the database provider
- Schema-first design with full TypeScript types generated from schema
- Connection pooling via @neondatabase/serverless

**Data Access Pattern**
- Storage abstraction layer (`server/storage.ts`) encapsulating all database operations
- Interface-driven design (IStorage) for potential future backend swaps
- Query helpers using Drizzle's query builder with relations

### Database Schema

**Core Entities**
- `users` - User profiles with currency preferences (linked to Replit auth)
- `creditCards` - Card details with cycle calculation fields (statementDay, dueDay, dayDifference)
- `cardStatements` - Monthly statements with amounts, limits, and status tracking
- `loans` - Recurring loan installments
- `budgets` - Monthly budget containers (year/month composite key)
- `incomes` - Income items linked to budgets
- `expenses` - Expense items with kind field (REGULAR, CARD_BILL, LOAN)
- `sessions` - Session storage for Replit Auth

**Key Design Decisions**
- Decimal type for monetary amounts to ensure precision
- Date type for cycle tracking (statement/due dates)
- Enum for expense kinds to differentiate card bills from regular expenses
- Recurring flags on income/expenses for next-month rollover
- Status tracking (pending/done) with paid date fields

**Relationships**
- User → Credit Cards (one-to-many)
- User → Loans (one-to-many)
- User → Budgets (one-to-many)
- Budget → Incomes (one-to-many)
- Budget → Expenses (one-to-many)
- Credit Card → Card Statements (one-to-many)

### Business Logic

**Credit Card Cycle Prediction**
- Stores initial statement and due dates for any month
- Calculates and stores day difference between statement and due dates
- Predicts future months by advancing statement date by one month (clamped to month end)
- Adds day difference to get predicted due date
- Implementation in `client/src/lib/dateUtils.ts` and backend storage layer

**Budget Math Engine**
- `cardsTotal` = sum of all card statement totalDue amounts
- `nonCardExpensesTotal` = sum of expenses where kind != CARD_BILL
- `incomeTotal` = sum of all income amounts
- `afterCardPayments` = incomeTotal - cardsTotal
- `need` = max(0, nonCardExpensesTotal - afterCardPayments)
- Real-time calculation on frontend, displayed via KPI cards

**Cash-Out Planner Algorithm**
- Smart suggestion prioritizes cards with later due dates first
- Falls back to cards with larger available limits as secondary criteria
- Slider-based UI for user adjustment of withdrawal amounts
- Validation against each card's available limit
- Creates expense items labeled "Cash-out – {CardNickname}" when applied

**Next Month Creation**
- Copies all recurring income and expense items to new month
- Predicts card statement dates using cycle calculation
- Automatically includes all active loans in new month's expenses

## External Dependencies

**Authentication Service**
- Replit OIDC for user authentication and session management
- Environment variables: `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET`

**Database**
- Neon serverless PostgreSQL
- Environment variable: `DATABASE_URL`
- WebSocket-based connection for serverless compatibility

**Third-Party Libraries**
- Radix UI component primitives (dialogs, dropdowns, selects, etc.)
- TanStack Query for data fetching and caching
- date-fns for date manipulation
- Drizzle ORM and Drizzle Kit for database management
- Tailwind CSS for styling
- Zod for schema validation

**Build & Development Tools**
- Vite with React plugin
- TypeScript compiler
- ESBuild for server bundling
- PostCSS with Autoprefixer
- Replit-specific Vite plugins (cartographer, dev-banner, runtime-error-modal)

**Hosting Requirements**
- Node.js runtime environment
- PostgreSQL database access
- Environment variables for database and auth configuration
- Static file serving for built client assets