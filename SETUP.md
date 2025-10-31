# Budget Nikal - Setup and Running Instructions

This guide will help you set up and run the Budget Nikal application both locally and on Replit.

## Prerequisites

- **Node.js** 20+ (check with `node --version`)
- **PostgreSQL** database (local or hosted)
- **npm** or **yarn** package manager

## Environment Variables

The application requires the following environment variables:

### Required for All Environments
```bash
# PostgreSQL database connection string
DATABASE_URL=postgresql://user:password@host:port/database

# Session secret for encrypting session data (use a random string)
SESSION_SECRET=your-random-secret-key-here
```

### Required for Production (Supabase Auth)
```bash
# Get these from Supabase Dashboard → Project Settings → API
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### Local Development
For local development, you can run WITHOUT Supabase Auth credentials:
- Leave `SUPABASE_URL` and `SUPABASE_ANON_KEY` empty/unset in your `.env`
- The app will automatically run in **DEV mode** with simple bypass authentication
- Visit `/api/login` to auto-login as the demo user (demo-user-123)
- This allows you to test features without setting up authentication

## Installation

1. **Clone the repository** (or download it):
   ```bash
   cd /path/to/nikalBudget
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up your PostgreSQL database**:
   - Create a new PostgreSQL database
   - Get the connection string (e.g., `postgresql://user:password@localhost:5432/budget_nikal`)

4. **Create environment variables**:

   For local development, create a `.env` file in the project root:
   ```bash
   DATABASE_URL=postgresql://localhost:5432/budget_nikal
   SESSION_SECRET=your-super-secret-random-string-here-change-this
   ```

   For Replit, add these as Secrets in the Replit dashboard.

## Database Setup

After installing dependencies and setting up environment variables:

1. **Push the schema to your database**:
   ```bash
   npm run db:push
   ```

   This command will:
   - Connect to your PostgreSQL database
   - Create all necessary tables (users, sessions, budgets, incomes, expenses, credit_cards, card_statements, loans)
   - Set up proper foreign key relationships

2. **Seed demo data** (optional, for testing):
   ```bash
   npx tsx server/seed.ts
   ```

   This creates:
   - Demo user: `demo@budgetnikal.com`
   - 2 credit cards (JS Bank, Alfalah Bank)
   - 1 loan (Faysal Installment)
   - September 2025 budget (completed)
   - October 2025 budget (in progress)

## Running the Application

### Development Mode

**This runs both the server and client together with hot reload:**

```bash
npm run dev
```

The application will start on `http://localhost:5000` by default.

What happens:
- The Express server starts in development mode
- Vite dev server is integrated for hot module replacement (HMR)
- Frontend changes are reflected immediately
- Backend changes trigger automatic restart
- Both client and server run on a single port (5000)

### Production Mode

1. **Build the application**:
   ```bash
   npm run build
   ```

   This will:
   - Build the React frontend using Vite
   - Bundle the Express backend using esbuild
   - Output everything to the `dist/` directory

2. **Start the production server**:
   ```bash
   npm start
   ```

   The application will run on port 5000 (or the PORT environment variable).

### Type Checking

To check for TypeScript errors without running the app:

```bash
npm run check
```

## Local Development Tips

### Port Configuration

By default, the app uses port 5000. To use a different port:

```bash
PORT=3000 npm run dev
```

### Database Migration

If you make changes to the schema in `shared/schema.ts`:

1. Update the schema file
2. Run `npm run db:push` to apply changes to the database
3. Restart the dev server

**Warning**: `db:push` will modify your database schema directly. For production, consider using migrations instead.

### Debugging

- **Server logs**: Check the terminal where you ran `npm run dev`
- **Client logs**: Check the browser console (F12)
- **Database issues**: Verify your DATABASE_URL is correct
- **Authentication issues**: On Replit, ensure REPL_ID and ISSUER_URL are set

### Common Issues

1. **Database connection errors**:
   - Verify PostgreSQL is running
   - Check DATABASE_URL format is correct
   - Ensure the database exists and is accessible

2. **Port already in use**:
   - Another process is using port 5000
   - Kill the process or use a different port with PORT=3001 npm run dev

3. **Authentication not working**:
   - **Development mode**: Visit `/api/login` to auto-login as demo user
   - **Production mode**: Verify SUPABASE_URL and SUPABASE_ANON_KEY are set correctly
   - Check browser console for any auth-related errors

4. **Build errors**:
   - Run `npm run check` to see TypeScript errors
   - Clear `node_modules` and reinstall: `rm -rf node_modules package-lock.json && npm install`

## Project Structure

```
nikalBudget/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components (buttons, dialogs, lists, etc.)
│   │   ├── pages/         # Route pages (home, settings, landing)
│   │   ├── hooks/         # React hooks (useAuth, useToast)
│   │   └── lib/           # Utilities (currency, dateUtils, queryClient)
├── server/                # Express backend
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API endpoints
│   ├── storage.ts        # Database operations
│   ├── db.ts             # Database connection
│   ├── supabaseAuth.ts   # Supabase authentication setup
│   └── seed.ts           # Demo data seeder
├── shared/
│   └── schema.ts         # Database schema (Drizzle ORM)
└── package.json          # Dependencies and scripts
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run check` | Run TypeScript type checking |
| `npm run db:push` | Push schema changes to database |
| `npx tsx server/seed.ts` | Seed demo data |

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Wouter** for routing
- **TanStack Query** for data fetching
- **Tailwind CSS** + **Shadcn UI** for styling
- **React Hook Form** + **Zod** for forms

### Backend
- **Express.js** with TypeScript
- **PostgreSQL** database
- **Drizzle ORM** for type-safe queries
- **Supabase Auth** for authentication (with dev mode bypass)
- **Express Session** with PostgreSQL store

## Next Steps

1. **Start the development server**: `npm run dev`
2. **Open in browser**: Navigate to `http://localhost:5000`
3. **Sign in**:
   - **Development**: Visit `/api/login` for auto-login
   - **Production**: Use Supabase Auth signup/signin
4. **Explore**: Add income, expenses, credit cards, and loans
5. **Test features**: Try the cash-out planner and create next month

## Support

For issues or questions:
1. Check the console logs (server and browser)
2. Verify environment variables are set correctly
3. Ensure PostgreSQL is running and accessible
4. Check the CLAUDE.md file for architecture details

## Production Deployment

### Deploying to Vercel (Recommended)

1. **Push your code to GitHub**

2. **Import to Vercel**:
   - Go to vercel.com and import your repository
   - Vercel will auto-detect the Node.js project

3. **Set Environment Variables** in Vercel Dashboard:
   ```
   DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@...pooler.supabase.com:6543/postgres
   SESSION_SECRET=your-production-secret-key
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   NODE_ENV=production
   ```

4. **Configure Build Settings**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

5. **Deploy**: Vercel will automatically build and deploy

### Other Platforms (Railway, Render, etc.)

The same environment variables are required. Ensure:
1. Set all environment variables in your hosting platform
2. Run `npm run build` to create optimized builds
3. Use `npm start` to run the production server
4. Ensure Supabase database is properly configured
5. Set up proper backup strategies for your database

---

**Happy budgeting! 💰**
