import type { VercelRequest, VercelResponse } from "@vercel/node";
import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { storage } from "../server/storage";
import { setupAuth, isAuthenticated, getUserId } from "../server/supabaseAuth";

// Extend Express Request
declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

let appPromise: Promise<express.Express> | null = null;

async function createApp() {
  const app = express();

  app.use(express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  }));
  app.use(express.urlencoded({ extended: false }));

  // Lightweight API log
  app.use((req, res, next) => {
    const start = Date.now();
    let body: any;
    const orig = res.json.bind(res);
    (res as any).json = (b: any) => {
      body = b;
      return orig(b);
    };
    res.on("finish", () => {
      if (req.path.startsWith("/api"))
        console.log(`${req.method} ${req.path} ${res.statusCode} in ${Date.now() - start}ms`);
    });
    next();
  });

  // Setup authentication
  await setupAuth(app);

  // Register routes
  await registerRoutes(app);

  // Health check
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || "Internal Server Error" });
  });

  return app;
}

async function registerRoutes(app: express.Express) {
  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Settings - Update currency
  app.patch('/api/settings/currency', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { currencyCode } = req.body;

      if (!currencyCode) {
        return res.status(400).json({ message: "Currency code is required" });
      }

      await storage.updateUserCurrency(userId, currencyCode);
      res.json({ message: "Currency updated successfully" });
    } catch (error) {
      console.error("Error updating currency:", error);
      res.status(500).json({ message: "Failed to update currency" });
    }
  });

  // Credit Cards - Get all
  app.get('/api/cards', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const cards = await storage.getCreditCards(userId);

      // Get year and month from query params, default to current month
      const now = new Date();
      const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();
      const month = req.query.month ? parseInt(req.query.month) : now.getMonth() + 1;

      const cardsWithAvailableLimit = await Promise.all(cards.map(async (card) => {
        // Get ALL statements for this card
        const allStatements = await storage.getAllCardStatements(card.id);

        // Filter statements whose due date falls EXACTLY in the current viewing month
        const targetMonthStart = new Date(year, month - 1, 1);
        const targetMonthEnd = new Date(year, month, 0, 23, 59, 59, 999);

        const relevantStatements = allStatements.filter(stmt => {
          const dueDate = new Date(stmt.dueDate + 'T00:00:00');
          const isInMonth = dueDate >= targetMonthStart && dueDate <= targetMonthEnd;
          return isInMonth && stmt.status === 'pending';
        });

        let totalDueAmount = 0;
        for (const stmt of relevantStatements) {
          totalDueAmount += parseFloat(stmt.totalDue);
        }

        const budget = await storage.getBudget(userId, year, month);
        let cashOutAmount = 0;
        if (budget) {
          const incomes = await storage.getIncomes(budget.id);
          const cashOutIncome = incomes.find(inc => inc.source === `Cash-out – ${card.nickname}`);
          if (cashOutIncome) {
            cashOutAmount = parseFloat(cashOutIncome.amount);
          }
        }

        let availableLimit = card.totalLimit;
        if (card.totalLimit) {
          const totalLimitNum = parseFloat(card.totalLimit);
          availableLimit = (totalLimitNum - totalDueAmount - cashOutAmount).toFixed(2);
        }

        return {
          ...card,
          availableLimit,
        };
      }));

      res.json({ cards: cardsWithAvailableLimit });
    } catch (error) {
      console.error("Error fetching cards:", error);
      res.status(500).json({ message: "Failed to fetch cards" });
    }
  });

  // Credit Cards - Create
  app.post('/api/cards', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { nickname, issuer, last4, statementDay, dueDay, dayDifference, firstStatementDate, billingCycleDays, totalLimit } = req.body;

      if (!nickname || !statementDay || !dueDay || dayDifference === undefined) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const card = await storage.createCreditCard(userId, {
        nickname,
        issuer,
        last4,
        statementDay,
        dueDay,
        dayDifference,
        firstStatementDate: firstStatementDate || undefined,
        billingCycleDays: billingCycleDays || 30,
        totalLimit,
      });

      res.json({ card });
    } catch (error) {
      console.error("Error creating card:", error);
      res.status(500).json({ message: "Failed to create card" });
    }
  });

  // Credit Cards - Update
  app.patch('/api/cards/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { nickname, issuer, last4, statementDay, dueDay, dayDifference, firstStatementDate, billingCycleDays, totalLimit } = req.body;

      if (!nickname || !statementDay || !dueDay || dayDifference === undefined) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      await storage.updateCreditCard(id, {
        nickname,
        issuer,
        last4,
        statementDay,
        dueDay,
        dayDifference,
        firstStatementDate,
        billingCycleDays,
        totalLimit,
      });

      res.json({ message: "Credit card updated successfully" });
    } catch (error) {
      console.error("Error updating card:", error);
      res.status(500).json({ message: "Failed to update card" });
    }
  });

  // Credit Cards - Delete
  app.delete('/api/cards/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCreditCard(id);
      res.json({ message: "Credit card deleted successfully" });
    } catch (error) {
      console.error("Error deleting card:", error);
      res.status(500).json({ message: "Failed to delete card" });
    }
  });

  // Cards - Reorder
  app.post('/api/cards/reorder', isAuthenticated, async (req: any, res) => {
    try {
      const { items } = req.body;

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ message: "Invalid items array" });
      }

      await storage.updateCardsOrder(items);
      res.json({ message: "Cards reordered successfully" });
    } catch (error) {
      console.error("Error reordering cards:", error);
      res.status(500).json({ message: "Failed to reorder cards" });
    }
  });

  // Get all statements for a specific card
  app.get('/api/cards/:cardId/statements', isAuthenticated, async (req: any, res) => {
    try {
      const { cardId } = req.params;
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const month = req.query.month ? parseInt(req.query.month as string) : new Date().getMonth() + 1;

      console.log(`Fetching statements for card ${cardId}, year ${year}, month ${month}`);

      const card = await storage.getCardById(cardId);
      if (!card) {
        console.error(`Card not found: ${cardId}`);
        return res.status(404).json({ message: "Card not found" });
      }

      console.log(`Card found:`, card.nickname);

      let statements = await storage.getAllCardStatements(cardId);
      console.log(`Existing statements count: ${statements.length}`);

      let prevYear = year;
      let prevMonth = month - 1;
      if (prevMonth < 1) {
        prevMonth = 12;
        prevYear = year - 1;
      }

      const previousMonthStatement = statements.find(s => s.year === prevYear && s.month === prevMonth);

      if (!previousMonthStatement) {
        console.log(`Creating new statement for previous month ${prevYear}-${prevMonth}`);

        const statementDay = Math.min(card.statementDay, getDaysInMonth(prevYear, prevMonth));
        const statementDate = new Date(prevYear, prevMonth - 1, statementDay);
        const dueDate = new Date(statementDate);
        dueDate.setDate(dueDate.getDate() + card.dayDifference);

        console.log(`Previous month - Statement date: ${formatDate(statementDate)}, Due date: ${formatDate(dueDate)}`);

        const newStatement = await storage.createCardStatement({
          cardId: cardId,
          year: prevYear,
          month: prevMonth,
          statementDate: formatDate(statementDate),
          dueDate: formatDate(dueDate),
          totalDue: '0',
          minimumDue: '0',
          availableLimit: '0',
          status: 'pending',
          paidDate: null,
        });

        console.log(`Created previous month statement:`, newStatement.id);
        statements.push(newStatement);
      }

      const currentMonthStatement = statements.find(s => s.year === year && s.month === month);

      if (!currentMonthStatement) {
        console.log(`Creating new statement for ${year}-${month}`);

        const statementDay = Math.min(card.statementDay, getDaysInMonth(year, month));
        const statementDate = new Date(year, month - 1, statementDay);
        const dueDate = new Date(statementDate);
        dueDate.setDate(dueDate.getDate() + card.dayDifference);

        console.log(`Statement date: ${formatDate(statementDate)}, Due date: ${formatDate(dueDate)}`);

        const newStatement = await storage.createCardStatement({
          cardId,
          year,
          month,
          statementDate: formatDate(statementDate),
          dueDate: formatDate(dueDate),
          totalDue: '0',
          minimumDue: '0',
          availableLimit: '0',
          status: 'pending',
          paidDate: null,
        });

        console.log(`Created statement:`, newStatement.id);
        statements.push(newStatement);
      }

      statements.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });

      console.log(`Returning ${statements.length} statements`);
      res.json({ statements });
    } catch (error) {
      console.error("Error fetching statements:", error);
      res.status(500).json({ message: "Failed to fetch statements" });
    }
  });

  // Loans - Get all
  app.get('/api/loans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const loans = await storage.getLoans(userId);
      res.json({ loans });
    } catch (error) {
      console.error("Error fetching loans:", error);
      res.status(500).json({ message: "Failed to fetch loans" });
    }
  });

  // Loans - Create
  app.post('/api/loans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { name, installmentAmount, nextDueDate } = req.body;

      if (!name || !installmentAmount || !nextDueDate) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const loan = await storage.createLoan(userId, {
        name,
        installmentAmount,
        nextDueDate,
        recurring: true,
      });

      res.json({ loan });
    } catch (error) {
      console.error("Error creating loan:", error);
      res.status(500).json({ message: "Failed to create loan" });
    }
  });

  // Loans - Update
  app.patch('/api/loans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, installmentAmount, nextDueDate } = req.body;

      if (!name || !installmentAmount || !nextDueDate) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      await storage.updateLoan(id, {
        name,
        installmentAmount,
        nextDueDate,
      });

      res.json({ message: "Loan updated successfully" });
    } catch (error) {
      console.error("Error updating loan:", error);
      res.status(500).json({ message: "Failed to update loan" });
    }
  });

  // Loans - Delete
  app.delete('/api/loans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteLoan(id);
      res.json({ message: "Loan deleted successfully" });
    } catch (error) {
      console.error("Error deleting loan:", error);
      res.status(500).json({ message: "Failed to delete loan" });
    }
  });

  // Loans - Reorder
  app.post('/api/loans/reorder', isAuthenticated, async (req: any, res) => {
    try {
      const { items } = req.body;

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ message: "Invalid items array" });
      }

      await storage.updateLoansOrder(items);
      res.json({ message: "Loans reordered successfully" });
    } catch (error) {
      console.error("Error reordering loans:", error);
      res.status(500).json({ message: "Failed to reorder loans" });
    }
  });

  // Budgets - Get budget for specific month
  app.get('/api/budgets/:year/:month', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);

      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid year or month" });
      }

      let budget = await storage.getBudget(userId, year, month);
      if (!budget) {
        budget = await storage.createBudget({ userId, year, month });
      }

      console.log('Fetching data for budget:', budget.id, 'user:', userId);
      const incomes = await storage.getIncomes(budget.id);
      console.log('Fetched incomes:', incomes.length);
      const expenses = await storage.getExpenses(budget.id);
      console.log('Fetched expenses:', expenses.length);
      const cardStatements = await storage.getCardStatementsDueInMonth(userId, year, month);
      console.log('Fetched card statements:', cardStatements.length);

      // Helper function to safely parse decimal values
      const safeParseFloat = (value: any): number => {
        if (value === null || value === undefined || value === '') return 0;
        const parsed = parseFloat(String(value));
        return isNaN(parsed) ? 0 : parsed;
      };

      // Calculate totals
      const incomeTotal = incomes.reduce((sum, inc) => sum + safeParseFloat(inc.amount), 0);

      // Cards total: sum of all CARD_BILL expenses (regardless of payment status)
      const cardBillExpenses = expenses.filter(exp => exp.kind === 'CARD_BILL');
      const cardsTotal = cardBillExpenses.reduce((sum, exp) => sum + safeParseFloat(exp.amount), 0);

      // Calculate paid card expenses (marked as done)
      const paidCardExpenses = expenses
        .filter(exp => exp.kind === 'CARD_BILL' && exp.status === 'done')
        .reduce((sum, exp) => sum + safeParseFloat(exp.amount), 0);

      // Non-card expenses: REGULAR + LOAN expenses (regardless of payment status)
      const nonCardExpensesTotal = expenses
        .filter(exp => exp.kind !== 'CARD_BILL')
        .reduce((sum, exp) => sum + safeParseFloat(exp.amount), 0);

      // Total expenses: all expenses combined (regardless of payment status)
      const totalExpenses = expenses.reduce((sum, exp) => sum + safeParseFloat(exp.amount), 0);

      // Debug logging for production
      console.log('Budget calculation debug:', {
        budgetId: budget.id,
        year,
        month,
        expensesCount: expenses.length,
        expensesRaw: expenses.map(exp => ({ id: exp.id, label: exp.label, amount: exp.amount, kind: exp.kind })),
        totalExpenses,
        incomeTotal,
        nonCardExpensesTotal,
      });

      // After card payments: always use total cards (not just unpaid) so it doesn't change when marking as done
      const afterCardPayments = incomeTotal - cardsTotal;

      // balanceUsed stores total cash-out amount
      const balanceUsed = safeParseFloat(budget.balanceUsed || '0');

      // Balance: Income minus paid card bills
      // Cash-outs are already included in incomeTotal (as income items)
      const balance = incomeTotal - paidCardExpenses;

      const need = Math.max(0, nonCardExpensesTotal - afterCardPayments);

      res.json({
        budget,
        incomes,
        expenses,
        cardStatements,
        totals: {
          incomeTotal,
          cardsTotal,
          nonCardExpensesTotal,
          totalExpenses,
          afterCardPayments,
          balanceUsed,
          balance,
          need,
        },
      });
    } catch (error) {
      console.error("Error fetching budget:", error);
      res.status(500).json({ message: "Failed to fetch budget" });
    }
  });

  // Income - Create
  app.post('/api/budgets/:year/:month/incomes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      const { source, amount, recurring } = req.body;

      if (!source || !amount) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      let budget = await storage.getBudget(userId, year, month);
      if (!budget) {
        budget = await storage.createBudget({ userId, year, month });
      }

      const income = await storage.createIncome({
        budgetId: budget.id,
        source,
        amount,
        recurring: recurring || false,
        status: 'pending',
        paidDate: null,
      });

      res.json({ income });
    } catch (error) {
      console.error("Error creating income:", error);
      res.status(500).json({ message: "Failed to create income" });
    }
  });

  // Income - Update status
  app.patch('/api/incomes/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || (status !== 'pending' && status !== 'done')) {
        return res.status(400).json({ message: "Invalid status" });
      }

      await storage.updateIncomeStatus(id, status);
      res.json({ message: "Status updated successfully" });
    } catch (error) {
      console.error("Error updating income status:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  // Income - Update
  app.patch('/api/incomes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { source, amount, recurring } = req.body;

      if (!source || !amount) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      await storage.updateIncome(id, { source, amount, recurring });
      res.json({ message: "Income updated successfully" });
    } catch (error) {
      console.error("Error updating income:", error);
      res.status(500).json({ message: "Failed to update income" });
    }
  });

  // Income - Delete
  app.delete('/api/incomes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteIncome(id);
      res.json({ message: "Income deleted successfully" });
    } catch (error) {
      console.error("Error deleting income:", error);
      res.status(500).json({ message: "Failed to delete income" });
    }
  });

  // Income - Reorder
  app.post('/api/incomes/reorder', isAuthenticated, async (req: any, res) => {
    try {
      const { items } = req.body;

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ message: "Invalid items array" });
      }

      await storage.updateIncomesOrder(items);
      res.json({ message: "Incomes reordered successfully" });
    } catch (error) {
      console.error("Error reordering incomes:", error);
      res.status(500).json({ message: "Failed to reorder incomes" });
    }
  });

  // Expense - Create
  app.post('/api/budgets/:year/:month/expenses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      const { label, amount, recurring } = req.body;

      if (!label || !amount) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      let budget = await storage.getBudget(userId, year, month);
      if (!budget) {
        budget = await storage.createBudget({ userId, year, month });
      }

      const expense = await storage.createExpense({
        budgetId: budget.id,
        label,
        amount,
        recurring: recurring || false,
        status: 'pending',
        paidDate: null,
        kind: 'REGULAR',
        linkedCardStatementId: null,
        linkedLoanId: null,
      });

      res.json({ expense });
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  // Expense - Update status
  app.patch('/api/expenses/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || (status !== 'pending' && status !== 'done')) {
        return res.status(400).json({ message: "Invalid status" });
      }

      await storage.updateExpenseStatus(id, status);
      res.json({ message: "Status updated successfully" });
    } catch (error) {
      console.error("Error updating expense status:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  // Expense - Update
  app.patch('/api/expenses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { label, amount, recurring } = req.body;

      if (!label || !amount) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      await storage.updateExpense(id, { label, amount, recurring });
      res.json({ message: "Expense updated successfully" });
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  // Expense - Delete
  app.delete('/api/expenses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteExpense(id);
      res.json({ message: "Expense deleted successfully" });
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Expense - Reorder
  app.post('/api/expenses/reorder', isAuthenticated, async (req: any, res) => {
    try {
      const { items } = req.body;

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ message: "Invalid items array" });
      }

      await storage.updateExpensesOrder(items);
      res.json({ message: "Expenses reordered successfully" });
    } catch (error) {
      console.error("Error reordering expenses:", error);
      res.status(500).json({ message: "Failed to reorder expenses" });
    }
  });

  // Cash-Out Planner
  app.post('/api/budgets/:year/:month/cash-out', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      const { withdrawals } = req.body;

      if (!Array.isArray(withdrawals) || withdrawals.length === 0) {
        return res.status(400).json({ message: "Invalid withdrawals data" });
      }

      let budget = await storage.getBudget(userId, year, month);
      if (!budget) {
        budget = await storage.createBudget({ userId, year, month });
      }

      const allCards = await storage.getCreditCards(userId);
      const cardMap = new Map(allCards.map(c => [c.id, c]));

      for (const withdrawal of withdrawals) {
        const { cardId, amount } = withdrawal;
        const card = cardMap.get(cardId);

        if (!card) continue;
        if (amount <= 0) continue;

        await storage.createExpense({
          budgetId: budget.id,
          label: `Cash-out – ${card.nickname}`,
          amount: amount.toString(),
          recurring: false,
          status: 'pending',
          paidDate: null,
          kind: 'REGULAR',
          linkedCardStatementId: null,
          linkedLoanId: null,
        });
      }

      res.json({ message: "Cash-out plan applied successfully" });
    } catch (error) {
      console.error("Error applying cash-out plan:", error);
      res.status(500).json({ message: "Failed to apply cash-out plan" });
    }
  });

  // Create Next Month
  app.post('/api/budgets/:year/:month/create-next', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);

      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid year or month" });
      }

      let nextYear = year;
      let nextMonth = month + 1;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }

      const existingBudget = await storage.getBudget(userId, nextYear, nextMonth);
      if (existingBudget) {
        return res.status(400).json({ message: "Next month budget already exists" });
      }

      const newBudget = await storage.createBudget({ userId, year: nextYear, month: nextMonth });

      const recurringIncomes = await storage.getRecurringIncomes(userId, year, month);
      const recurringExpenses = await storage.getRecurringExpenses(userId, year, month);

      for (const income of recurringIncomes) {
        await storage.createIncome({
          budgetId: newBudget.id,
          source: income.source,
          amount: income.amount,
          recurring: true,
          status: 'pending',
          paidDate: null,
        });
      }

      for (const expense of recurringExpenses) {
        await storage.createExpense({
          budgetId: newBudget.id,
          label: expense.label,
          amount: expense.amount,
          recurring: true,
          status: 'pending',
          paidDate: null,
          kind: 'REGULAR',
          linkedCardStatementId: null,
          linkedLoanId: null,
        });
      }

      const loans = await storage.getLoans(userId);
      for (const loan of loans) {
        await storage.createExpense({
          budgetId: newBudget.id,
          label: loan.name,
          amount: loan.installmentAmount,
          recurring: true,
          status: 'pending',
          paidDate: null,
          kind: 'LOAN',
          linkedCardStatementId: null,
          linkedLoanId: loan.id,
        });
      }

      const cards = await storage.getCreditCards(userId);
      for (const card of cards) {
        const nextStatementDay = Math.min(card.statementDay, getDaysInMonth(nextYear, nextMonth));
        const statementDate = new Date(nextYear, nextMonth - 1, nextStatementDay);
        const dueDate = new Date(statementDate);
        dueDate.setDate(dueDate.getDate() + card.dayDifference);

        await storage.createCardStatement({
          cardId: card.id,
          year: nextYear,
          month: nextMonth,
          statementDate: formatDate(statementDate),
          dueDate: formatDate(dueDate),
          totalDue: '0',
          minimumDue: '0',
          availableLimit: '0',
          status: 'pending',
          paidDate: null,
        });
      }

      res.json({ message: "Next month created successfully", budget: newBudget });
    } catch (error) {
      console.error("Error creating next month:", error);
      res.status(500).json({ message: "Failed to create next month" });
    }
  });
}

// Helper functions
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!appPromise) {
      appPromise = createApp();
    }

    const app = await appPromise;
    return app(req as any, res as any);
  } catch (error) {
    console.error("Error initializing app:", error);
    res.status(500).json({
      message: "Server initialization failed",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
