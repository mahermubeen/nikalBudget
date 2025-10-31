# Supabase Integration Guide for Budget Nikal

This guide will help you connect your Budget Nikal project to Supabase.

## Your Supabase Project Details

- **Project Name**: budgetNikal
- **Project URL**: https://fdkcpircbdoalvbwcwso.supabase.co
- **Project Reference**: fdkcpircbdoalvbwcwso
- **Region**: AWS ap-southeast-1 (Singapore)
- **Anon Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (for future client-side use)

## Step 1: Get Your Database Password

You need your database password to complete the connection string.

### If You Forgot Your Password:

1. Go to Supabase Dashboard → **Project Settings** → **Database**
2. Scroll to **Connection string** section
3. Click **Reset database password** if needed
4. Copy your new password

## Step 2: Get Your Connection String

1. In Supabase Dashboard, go to **Project Settings** (⚙️ icon)
2. Click **Database** in the left sidebar
3. Scroll down to **Connection string** section
4. Click **Connection pooling** tab
5. Select **Mode: Transaction**
6. Copy the connection string. It should look like:
   ```
   postgresql://postgres.fdkcpircbdoalvbwcwso:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```

7. Replace `[YOUR-PASSWORD]` with your actual database password

**Example:**
```
postgresql://postgres.fdkcpircbdoalvbwcwso:MySecurePass123!@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

## Step 3: Set Up Local Environment

### Create `.env` file in your project root:

```bash
# Copy from .env.example
cp .env.example .env
```

### Edit `.env` file with your details:

```bash
# Your Supabase Connection String (from Step 2)
DATABASE_URL=postgresql://postgres.fdkcpircbdoalvbwcwso:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres

# Generate a secure session secret
# Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=your-generated-secret-key-here

# Supabase Project Details (optional for now)
SUPABASE_URL=https://fdkcpircbdoalvbwcwso.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZka2NwaXJjYmRvYWx2Yndjd3NvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4OTk4ODIsImV4cCI6MjA3NzQ3NTg4Mn0.LdTRVy5JrZLIJ3fj1EJxKKf__gPFboQx_ecHKi2BI7Q

# Port and environment
PORT=5000
NODE_ENV=development
```

## Step 4: Generate Session Secret

Run this command to generate a secure session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as your `SESSION_SECRET` in the `.env` file.

## Step 5: Install Dependencies (if not already done)

```bash
npm install
```

## Step 6: Push Database Schema to Supabase

This will create all the necessary tables in your Supabase database:

```bash
npm run db:push
```

You should see output like:
```
✓ Applying changes to your database
✓ Done!
```

### Verify in Supabase:

1. Go to Supabase Dashboard → **Table Editor**
2. You should see these tables:
   - users
   - sessions
   - budgets
   - incomes
   - expenses
   - credit_cards
   - card_statements
   - loans

## Step 7: Seed Demo Data (Optional)

To populate your database with sample data for testing:

```bash
npx tsx server/seed.ts
```

This creates:
- Demo user: `demo@budgetnikal.com`
- 2 credit cards (JS Bank, Alfalah Bank)
- 1 loan (Faysal Installment)
- September 2025 budget (completed)
- October 2025 budget (in progress)

## Step 8: Start the Application

```bash
npm run dev
```

The app will start on http://localhost:5000

## Step 9: Test the Connection

1. Open http://localhost:5000 in your browser
2. You should see the landing page
3. Click "Get Started" to log in

## Troubleshooting

### Error: "DATABASE_URL must be set"

- Check that your `.env` file exists in the project root
- Verify the DATABASE_URL is correctly formatted
- Restart the dev server after changing `.env`

### Error: "Connection refused" or "Timeout"

- Check your database password is correct
- Verify your connection string format
- Ensure you're using the **Connection pooling** URL (port 6543), not the direct connection

### Error: "relation does not exist"

- You forgot to run `npm run db:push`
- Run the command to create tables in Supabase

### Tables not appearing in Supabase

- Check you ran `npm run db:push` successfully
- Go to Supabase Dashboard → Database → Tables to verify
- Check the SQL Editor for any errors

## Verifying Your Setup

### Check Database Connection:

```bash
# Run this to test the connection
npx tsx -e "
import { pool } from './server/db.ts';
pool.query('SELECT NOW()').then(result => {
  console.log('✅ Database connected:', result.rows[0]);
  process.exit(0);
}).catch(err => {
  console.error('❌ Database connection failed:', err.message);
  process.exit(1);
});
"
```

### Check Tables:

In Supabase Dashboard → SQL Editor, run:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

You should see all 8 tables listed.

## Using Supabase Features

### Table Editor
- View and edit data directly in Supabase Dashboard → Table Editor
- Add, update, or delete records manually for testing

### SQL Editor
- Run custom queries in Supabase Dashboard → SQL Editor
- Export data, create views, or run analytics

### Database Backups
- Supabase automatically backs up your database
- Go to Project Settings → Database → Backups to manage

### Real-time Features (Future Enhancement)
- Supabase supports real-time data synchronization
- Can be added to Budget Nikal for live updates across devices

## Environment Variables for Deployment

When deploying to Vercel, Railway, or other platforms, set these environment variables:

```bash
DATABASE_URL=postgresql://postgres.fdkcpircbdoalvbwcwso:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
SESSION_SECRET=your-production-secret-key
SUPABASE_URL=https://fdkcpircbdoalvbwcwso.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=production
```

## Next Steps

### Optional Enhancements:

1. **Replace Replit Auth with Supabase Auth**
   - Use Supabase's built-in authentication
   - More deployment-friendly
   - Better user management

2. **Add Row Level Security (RLS)**
   - Protect user data in Supabase
   - Prevent unauthorized access

3. **Use Supabase Storage**
   - Store user profile pictures
   - Store financial documents

4. **Add Real-time Features**
   - Live budget updates
   - Multi-device synchronization

Would you like help with any of these enhancements?

## Support

If you encounter issues:

1. Check Supabase Dashboard → Project Settings → Database for connection issues
2. View logs in Supabase Dashboard → Logs
3. Check the console output in your terminal
4. Verify all environment variables are set correctly

---

**You're all set!** 🎉 Your Budget Nikal app is now connected to Supabase.
