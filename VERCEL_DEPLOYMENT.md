# Vercel Deployment Guide

This guide will help you deploy your Budget Nikal app to Vercel with proper environment variables.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Supabase project with authentication enabled
3. Your database properly set up with all tables

## Step 1: Install Vercel CLI (Optional)

```bash
npm i -g vercel
```

## Step 2: Set Environment Variables in Vercel

You need to set the following environment variables in your Vercel project:

### Method A: Via Vercel Dashboard

1. Go to your project on Vercel
2. Click on **Settings**
3. Click on **Environment Variables**
4. Add the following variables:

| Variable Name | Value | Example |
|--------------|-------|---------|
| `DATABASE_URL` | Your Supabase connection pooler URL | `postgresql://postgres.fdkcpircbdoalvbwcwso:PASSWORD@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `SESSION_SECRET` | A random secret key (32+ chars) | `a8f5e2c9b1d4a7e6f3c8b9d2e5f1a4b7c3e6f9a2d5e8b1c4f7a3e6d9c2f5b8e1` |
| `SUPABASE_URL` | Your Supabase project URL | `https://fdkcpircbdoalvbwcwso.supabase.co` |
| `SUPABASE_ANON_KEY` | Your Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `NODE_ENV` | Set to `production` | `production` |

### Method B: Via Vercel CLI

```bash
vercel env add DATABASE_URL
# Paste your database URL when prompted

vercel env add SESSION_SECRET
# Paste your session secret when prompted

vercel env add SUPABASE_URL
# Paste your Supabase URL when prompted

vercel env add SUPABASE_ANON_KEY
# Paste your Supabase anon key when prompted

vercel env add NODE_ENV
# Type: production
```

## Step 3: Get Your Supabase Credentials

### Database URL (Connection Pooler - Transaction Mode)

1. Go to your Supabase Dashboard
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection Pooling**
5. Select **Transaction** mode
6. Copy the connection string
7. **IMPORTANT:** Replace `[YOUR-PASSWORD]` with your actual database password
8. **IMPORTANT:** URL-encode special characters in your password:
   - `@` becomes `%40`
   - `#` becomes `%23`
   - `$` becomes `%24`
   - `%` becomes `%25`

Example:
```
Password: Mubeen_Ahmad@123
Encoded:  Mubeen_Ahmad%40123

Final URL:
postgresql://postgres.fdkcpircbdoalvbwcwso:Mubeen_Ahmad%40123@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Supabase URL and Anon Key

1. Go to your Supabase Dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** (e.g., `https://fdkcpircbdoalvbwcwso.supabase.co`)
   - **anon/public key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### Session Secret

Generate a random secret key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Or use any random 32+ character string.

## Step 4: Deploy to Vercel

### Method A: Via Vercel CLI

```bash
vercel --prod
```

### Method B: Via GitHub Integration

1. Push your code to GitHub
2. Import your repository in Vercel
3. Vercel will automatically deploy on every push to main

## Step 5: Verify Deployment

1. Visit your deployed URL
2. Try to sign up for a new account
3. Check the Vercel logs if you encounter any errors:
   ```bash
   vercel logs
   ```

## Troubleshooting

### Error: "DATABASE_URL must be set"

- Make sure you've set the `DATABASE_URL` environment variable in Vercel
- Redeploy your project after setting environment variables

### Error: "Session expired. Please log in again"

- Make sure `SESSION_SECRET` is set
- Make sure it's the same value across all deployments

### Error: "Authentication failed"

- Check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correctly set
- Verify your Supabase project has authentication enabled
- Check Supabase logs for authentication errors

### Error: "500 Internal Server Error"

- Check Vercel function logs: `vercel logs --follow`
- Make sure all environment variables are set
- Verify database connection string is correct

## Important Notes

1. **Never commit `.env` file to Git** - It contains sensitive credentials
2. **Use transaction pooling mode** for Supabase (port 6543, not 5432)
3. **URL-encode your password** in the database connection string
4. **Set NODE_ENV=production** in Vercel for production mode
5. After adding/updating environment variables, **redeploy** your project

## Redeployment

After making code changes or updating environment variables:

```bash
# Commit your changes
git add .
git commit -m "Fix: deployment issues"
git push

# Or deploy directly
vercel --prod
```

## Support

If you encounter issues:
- Check Vercel logs: https://vercel.com/dashboard/deployments
- Check Supabase logs: https://app.supabase.com/project/_/logs
- Review the error messages in browser DevTools console
