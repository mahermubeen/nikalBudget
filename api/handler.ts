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
      res.json({ cards });
    } catch (error) {
      console.error("Error fetching cards:", error);
      res.status(500).json({ message: "Failed to fetch cards" });
    }
  });

  // Credit Cards - Create
  app.post('/api/cards', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { nickname, issuer, last4, statementDay, dueDay, dayDifference } = req.body;

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
      const { nickname, issuer, last4, statementDay, dueDay, dayDifference } = req.body;

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

      const incomes = await storage.getIncomes(budget.id);
      const expenses = await storage.getExpenses(budget.id);
      const cardStatements = await storage.getCardStatementsForMonth(userId, year, month);

      const incomeTotal = incomes.reduce((sum, inc) => sum + parseFloat(inc.amount), 0);
      const cardsTotal = cardStatements.reduce((sum, stmt) => sum + parseFloat(stmt.totalDue), 0);
      const nonCardExpensesTotal = expenses
        .filter(exp => exp.kind !== 'CARD_BILL')
        .reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
      const afterCardPayments = incomeTotal - cardsTotal;
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
          afterCardPayments,
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
