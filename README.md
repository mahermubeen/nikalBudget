# Budget Nikal

A mobile-first budget management application with intelligent credit card cycle tracking and cash-out planning.

## Features

### ✅ Complete MVP Implementation

1. **Replit Authentication**
   - Secure user authentication with email/password
   - Session management with PostgreSQL
   - Isolated user data

2. **Multi-Currency Support**
   - Full ISO 4217 currency list (20+ currencies)
   - Proper formatting with symbols and thousands separators
   - Safe numeric storage (decimal precision)

3. **Credit Card Management**
   - Add cards with nickname, issuer, last 4 digits
   - Dynamic cycle prediction (auto-calculates future statement/due dates)
   - Tracks day difference between statement and due date
   - Monthly statement tracking with total due, minimum due, available limit

4. **Loan Management**
   - Create loans with installment amount and due date
   - Automatically recurring
   - Appears in monthly expenses

5. **Monthly Budget Planning**
   - Income items with source, amount, recurring flag, status toggle
   - Expense items with label, amount, recurring flag, status toggle
   - Expense kinds: REGULAR, CARD_BILL, LOAN
   - Automatic totals calculation:
     - `cardsTotal = sum(CardStatements.totalDue)`
     - `nonCardExpensesTotal = sum(Expenses where kind != CARD_BILL)`
     - `incomeTotal = sum(Income)`
     - `afterCardPayments = incomeTotal - cardsTotal`
     - `need = max(0, nonCardExpensesTotal - afterCardPayments)`

6. **Cash-Out Planner**
   - Smart withdrawal suggestions (prioritizes later due dates, then larger limits)
   - Slider-based amount adjustment
   - Validation against available limits
   - Creates expenses when applied: "Cash-out – {CardNickname}"

7. **Recurring Items & Next Month**
   - Mark income/expenses as recurring
   - Create next month: copies recurring items, predicts card statement dates
   - Loans automatically included in new months

8. **Mobile-First UI**
   - Large touch targets (min-h-12 for all interactive elements)
   - Responsive grid layouts (1/2/4 columns)
   - KPI cards showing all key metrics
   - Status badges with visual indicators
   - Monospaced currency displays
   - Clean, professional fintech design

## API Endpoints

### Authentication
- `GET /api/auth/user` - Get current user info
- `GET /api/login` - Start login flow (Replit Auth)
- `GET /api/logout` - Log out

### Settings
- `PATCH /api/settings/currency` - Update display currency

### Credit Cards
- `GET /api/cards` - Get all user's credit cards
- `POST /api/cards` - Create new credit card

### Loans
- `GET /api/loans` - Get all user's loans
- `POST /api/loans` - Create new loan

### Budgets
- `GET /api/budgets/:year/:month` - Get budget with incomes, expenses, card statements, and totals

### Income
- `POST /api/budgets/:year/:month/incomes` - Create income item
- `PATCH /api/incomes/:id/status` - Toggle income status (pending/done)

### Expenses
- `POST /api/budgets/:year/:month/expenses` - Create expense item
- `PATCH /api/expenses/:id/status` - Toggle expense status (pending/done)

### Cash-Out Planner
- `POST /api/budgets/:year/:month/cash-out` - Apply cash-out plan (creates expenses)

### Create Next Month
- `POST /api/budgets/:year/:month/create-next` - Create next month with recurring items and predicted card dates

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Wouter** for routing
- **TanStack Query** for data fetching and caching
- **Tailwind CSS** + **Shadcn UI** for styling
- **React Hook Form** + **Zod** for form validation
- **date-fns** for date manipulation
- **Lucide React** for icons

### Backend
- **Express.js** with TypeScript
- **PostgreSQL** (Neon) for data persistence
- **Drizzle ORM** for type-safe database operations
- **Replit Auth** (OpenID Connect) for authentication
- **Passport.js** for session management
- **connect-pg-simple** for PostgreSQL session storage

## Database Schema

### Core Tables
- `users` - User accounts (from Replit Auth)
- `sessions` - Session storage (for Replit Auth)
- `credit_cards` - User's credit cards
- `card_statements` - Monthly card statements
- `loans` - User's loans
- `budgets` - Monthly budgets
- `incomes` - Income items
- `expenses` - Expense items (with kind: REGULAR/CARD_BILL/LOAN)

### Key Features
- All monetary values use `decimal(12, 2)` for precision
- Proper foreign key relationships with cascade deletes
- Recurring flags on incomes, expenses, and loans
- Status tracking (pending/done) with paid dates
- Linked references for card bills and loan payments

## Setup & Running

### Prerequisites
- Node.js 20+
- PostgreSQL database (auto-provisioned on Replit)

### Environment Variables
All required secrets are auto-configured on Replit:
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `REPL_ID` - Replit app ID (for OAuth)
- `ISSUER_URL` - OAuth issuer URL

### Installation
```bash
# Dependencies are auto-installed on Replit
npm install
```

### Database Migration
```bash
# Push schema to database
npm run db:push
```

### Seed Demo Data
```bash
# Populate database with sample data
npx tsx server/seed.ts
```

This creates:
- Demo user: demo@budgetnikal.com
- 2 credit cards: JS Bank, Alfalah Bank
- 1 loan: Faysal Installment
- September 2025 budget (completed)
- October 2025 budget (in progress)
- Realistic Pakistani banking examples

### Run Application
```bash
# Start development server
npm run dev
```

Application runs on `http://localhost:5000`

## Usage

1. **Login** - Click "Get Started" and sign in with Replit Auth
2. **View Dashboard** - See current month's budget with KPI cards
3. **Add Income/Expenses** - Click + buttons to add items
4. **Manage Cards/Loans** - Add credit cards and loans for tracking
5. **Toggle Status** - Click checkboxes to mark items as done
6. **Use Cash-Out Planner** - Click "Plan Cash-Out" to optimize withdrawals
7. **Create Next Month** - Copy recurring items to next month
8. **Change Currency** - Go to Settings to select your preferred currency

## Design Principles

- **Mobile-First**: Optimized for iPhone and laptop
- **Clean & Modern**: Professional fintech aesthetic
- **Large Touch Targets**: All buttons and inputs are min-h-12 (48px)
- **Monospaced Numbers**: All currency amounts use monospace font
- **Status Indicators**: Color-coded badges for quick status checks
- **Responsive**: 1 column mobile → 2 columns tablet → 4 columns desktop

## Footer

Every page displays: **"A product by DEVPOOL."**

## License

MIT

---

Built with ❤️ using Replit
