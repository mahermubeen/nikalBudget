import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, getUserId } from "./supabaseAuth";
import { z } from "zod";
import { db } from "./db";
import { budgets } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

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
        const targetMonthEnd = new Date(year, month, 0, 23, 59, 59, 999); // End of last day of month

        const relevantStatements = allStatements.filter(stmt => {
          const dueDate = new Date(stmt.dueDate + 'T00:00:00');
          const isInMonth = dueDate >= targetMonthStart && dueDate <= targetMonthEnd;
          return isInMonth && stmt.status === 'pending'; // Only count unpaid statements
        });

        // Calculate total due from relevant statements in this month only
        let totalDueAmount = 0;
        for (const stmt of relevantStatements) {
          totalDueAmount += parseFloat(stmt.totalDue);
        }

        // Get cash-out withdrawals for this card in the current month
        // Cash-outs are stored as income items with label "Cash-out – {CardNickname}"
        let cashOutAmount = 0;
        const budget = await storage.getBudget(userId, year, month);
        if (budget) {
          const incomes = await storage.getIncomes(budget.id);
          const cashOutIncome = incomes.find(inc => inc.source === `Cash-out – ${card.nickname}`);
          if (cashOutIncome) {
            cashOutAmount = parseFloat(cashOutIncome.amount);
          }
        }

        // Calculate available limit: totalLimit - totalDue - cashOut
        let availableLimit = card.totalLimit;
        if (card.totalLimit) {
          const totalLimitNum = parseFloat(card.totalLimit);
          availableLimit = (totalLimitNum - totalDueAmount - cashOutAmount).toFixed(2);

          console.log(`[CARD LIMIT] ${card.nickname}: limit=${totalLimitNum}, pending due=${totalDueAmount}, cash-out=${cashOutAmount}, available=${availableLimit}`);
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

      // Verify card belongs to user
      const card = await storage.getCardById(cardId);
      if (!card) {
        console.error(`Card not found: ${cardId}`);
        return res.status(404).json({ message: "Card not found" });
      }

      console.log(`Card found:`, card.nickname);

      // Get all existing statements for this card
      let statements = await storage.getAllCardStatements(cardId);
      console.log(`Existing statements count: ${statements.length}`);

      // Calculate previous month
      let prevYear = year;
      let prevMonth = month - 1;
      if (prevMonth < 1) {
        prevMonth = 12;
        prevYear = year - 1;
      }

      // Check if statement exists for the previous month
      const previousMonthStatement = statements.find(s => s.year === prevYear && s.month === prevMonth);

      if (!previousMonthStatement) {
        console.log(`Creating new statement for previous month ${prevYear}-${prevMonth}`);

        // Auto-create statement for previous month
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
      } else {
        console.log(`Found existing statement for previous month ${prevYear}-${prevMonth}:`, previousMonthStatement.id);
      }

      // Check if statement exists for the current viewing month
      const currentMonthStatement = statements.find(s => s.year === year && s.month === month);

      if (!currentMonthStatement) {
        console.log(`Creating new statement for ${year}-${month}`);

        // Auto-create statement for current month
        const statementDay = Math.min(card.statementDay, getDaysInMonth(year, month));
        const statementDate = new Date(year, month - 1, statementDay);
        const dueDate = new Date(statementDate);
        dueDate.setDate(dueDate.getDate() + card.dayDifference);

        console.log(`Statement date: ${formatDate(statementDate)}, Due date: ${formatDate(dueDate)}`);

        const newStatement = await storage.createCardStatement({
          cardId: cardId,
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
      } else {
        console.log(`Found existing statement for ${year}-${month}:`, currentMonthStatement.id);
      }

      // Sort statements by year and month (newest first)
      statements.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });

      console.log(`Returning ${statements.length} statements`);
      res.json({ statements });
    } catch (error) {
      console.error("Error fetching card statements:", error);
      res.status(500).json({ message: "Failed to fetch card statements", error: String(error) });
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
        recurring: true, // Loans are always recurring
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

  // Budgets - Get budget for specific month with all data
  app.get('/api/budgets/:year/:month', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);

      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid year or month" });
      }

      // Get or create budget
      let budget = await storage.getBudget(userId, year, month);
      if (!budget) {
        budget = await storage.createBudget({ userId, year, month });
      }

      // Get all related data
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

      // Calculate paid income only (marked as done)
      const paidIncomeTotal = incomes
        .filter(inc => inc.status === 'done')
        .reduce((sum, inc) => sum + safeParseFloat(inc.amount), 0);

      // Cards total: sum of all CARD_BILL expenses (regardless of payment status)
      const cardBillExpenses = expenses.filter(exp => exp.kind === 'CARD_BILL');
      const cardsTotal = cardBillExpenses.reduce((sum, exp) => sum + safeParseFloat(exp.amount), 0);

      console.log(`[BUDGET CALC] Card expenses breakdown:`, {
        totalExpenses: expenses.length,
        cardBillExpenses: cardBillExpenses.length,
        cardBillExpensesData: cardBillExpenses.map(exp => ({
          id: exp.id,
          label: exp.label,
          amount: exp.amount,
          kind: exp.kind,
          linkedCardStatementId: exp.linkedCardStatementId,
        })),
        cardsTotal,
      });

      // Calculate paid card expenses (marked as done)
      const paidCardExpenses = expenses
        .filter(exp => exp.kind === 'CARD_BILL' && exp.status === 'done')
        .reduce((sum, exp) => sum + safeParseFloat(exp.amount), 0);

      // Calculate paid non-card expenses (marked as done)
      const paidNonCardExpenses = expenses
        .filter(exp => exp.kind !== 'CARD_BILL' && exp.status === 'done')
        .reduce((sum, exp) => sum + safeParseFloat(exp.amount), 0);

      // Non-card expenses: REGULAR + LOAN expenses (regardless of payment status)
      const nonCardExpensesTotal = expenses
        .filter(exp => exp.kind !== 'CARD_BILL')
        .reduce((sum, exp) => sum + safeParseFloat(exp.amount), 0);

      // Pending non-card expenses: Only PENDING (unpaid) non-card expenses
      const pendingNonCardExpenses = expenses
        .filter(exp => exp.kind !== 'CARD_BILL' && exp.status === 'pending')
        .reduce((sum, exp) => sum + safeParseFloat(exp.amount), 0);

      // Pending card bills: Only PENDING (unpaid) card bills
      const pendingCardBills = expenses
        .filter(exp => exp.kind === 'CARD_BILL' && exp.status === 'pending')
        .reduce((sum, exp) => sum + safeParseFloat(exp.amount), 0);

      // Total expenses: all expenses combined (regardless of payment status)
      const totalExpenses = expenses.reduce((sum, exp) => sum + safeParseFloat(exp.amount), 0);

      // Debug logging for production
      console.log('Budget calculation debug:', {
        budgetId: budget.id,
        year,
        month,
        expensesCount: expenses.length,
        expensesRaw: expenses.map(exp => ({ id: exp.id, label: exp.label, amount: exp.amount, kind: exp.kind, status: exp.status })),
        totalExpenses,
        incomeTotal,
        paidIncomeTotal,
        nonCardExpensesTotal,
        pendingNonCardExpenses,
        pendingCardBills,
      });

      // After card payments: always use total cards (not just unpaid) so it doesn't change when marking as done
      const afterCardPayments = incomeTotal - cardsTotal;

      // balanceUsed stores total cash-out amount
      const balanceUsed = safeParseFloat(budget.balanceUsed || '0');

      // Balance: PAID income minus all paid expenses (card bills + regular + loans)
      // Only count income that has been received (marked as done)
      const balance = paidIncomeTotal - paidCardExpenses - paidNonCardExpenses;

      // Need: Calculate how much cash-out is needed to cover ALL pending expenses
      // Total pending expenses = pending card bills + pending non-card expenses
      const totalPendingExpenses = pendingCardBills + pendingNonCardExpenses;

      // If balance is sufficient to cover all pending expenses, no cash-out needed
      // Otherwise, need to cash out the difference
      const need = Math.max(0, totalPendingExpenses - balance);

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

      // Get or create budget
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

      // If this is a recurring income, automatically add it to all existing future months
      if (recurring) {
        await storage.copyRecurringIncomeToFutureMonths(userId, year, month, income);
      }

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
      const { label, amount, recurring, statementId } = req.body;

      console.log(`[CREATE EXPENSE] Received request for ${year}/${month}:`, {
        label,
        amount,
        recurring,
        statementId,
        userId,
      });

      if (!label || !amount) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Get or create budget
      let budget = await storage.getBudget(userId, year, month);
      if (!budget) {
        budget = await storage.createBudget({ userId, year, month });
      }

      let expenseKind = 'REGULAR';
      let linkedCardStatementId = null;

      // If statementId is provided, this is a card bill expense
      if (statementId) {
        console.log(`[CREATE EXPENSE] StatementId provided: ${statementId}, verifying...`);

        // Verify the statement exists
        const statement = await storage.getCardStatementById(statementId);
        if (!statement) {
          console.error(`[CREATE EXPENSE] Statement not found: ${statementId}`);
          return res.status(400).json({ message: "Invalid statement ID" });
        }

        console.log(`[CREATE EXPENSE] Statement found:`, {
          id: statement.id,
          cardId: statement.cardId,
          year: statement.year,
          month: statement.month,
          currentTotalDue: statement.totalDue,
        });

        // Update the totalDue by adding the new expense amount
        const currentTotalDue = parseFloat(statement.totalDue);
        const newTotalDue = (currentTotalDue + parseFloat(amount)).toFixed(2);
        await storage.updateCardStatement(statement.id, {
          totalDue: newTotalDue,
        });

        console.log(`[CREATE EXPENSE] Updated statement totalDue from ${currentTotalDue} to ${newTotalDue}`);

        expenseKind = 'CARD_BILL';
        linkedCardStatementId = statement.id;
      } else {
        console.log(`[CREATE EXPENSE] No statementId provided, creating REGULAR expense`);
      }

      const expense = await storage.createExpense({
        budgetId: budget.id,
        label,
        amount,
        recurring: recurring || false,
        status: 'pending',
        paidDate: null,
        kind: expenseKind,
        linkedCardStatementId,
        linkedLoanId: null,
      });

      console.log(`[CREATE EXPENSE] Created expense:`, {
        id: expense.id,
        label: expense.label,
        amount: expense.amount,
        kind: expense.kind,
        linkedCardStatementId: expense.linkedCardStatementId,
      });

      // If this is a recurring REGULAR expense, automatically add it to all existing future months
      if (recurring && expenseKind === 'REGULAR') {
        await storage.copyRecurringExpenseToFutureMonths(userId, year, month, expense);
      }

      res.json({ expense });
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  // Expense - Update status
  app.patch('/api/expenses/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const { status } = req.body;

      if (!status || (status !== 'pending' && status !== 'done')) {
        return res.status(400).json({ message: "Invalid status" });
      }

      // Get the expense to check if it's linked to a card statement
      const expense = await storage.getExpenseById(id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      // If it's a card bill expense, update the card statement's totalDue and status
      if (expense.kind === 'CARD_BILL' && expense.linkedCardStatementId) {
        const statement = await storage.getCardStatementById(expense.linkedCardStatementId);
        if (statement) {
          const currentTotalDue = parseFloat(statement.totalDue);
          const expenseAmount = parseFloat(expense.amount);
          let newTotalDue;
          let newStatementStatus = statement.status;
          let newPaidDate = statement.paidDate;

          if (status === 'done' && expense.status === 'pending') {
            // Marking as done (paid) - subtract from totalDue
            newTotalDue = Math.max(0, currentTotalDue - expenseAmount).toFixed(2);

            // Mark statement as done and set paid date
            newStatementStatus = 'done';
            newPaidDate = new Date().toISOString().split('T')[0];
          } else if (status === 'pending' && expense.status === 'done') {
            // Marking back to pending (unpaid) - add back to totalDue and reset statement
            newTotalDue = (currentTotalDue + expenseAmount).toFixed(2);
            newStatementStatus = 'pending';
            newPaidDate = null;

            // Reset balanceUsed if this was the last paid card bill
            const budget = await db.select().from(budgets).where(eq(budgets.id, expense.budgetId)).limit(1);
            if (budget.length > 0) {
              await storage.updateBudgetBalanceUsed(budget[0].id, '0');
            }
          } else {
            // No change in status, keep same totalDue
            newTotalDue = currentTotalDue.toFixed(2);
          }

          await storage.updateCardStatement(statement.id, {
            totalDue: newTotalDue,
            status: newStatementStatus,
            paidDate: newPaidDate,
          });
        }
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

      // Get the expense first to check if it's linked to a card statement
      const expense = await storage.getExpenseById(id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      // If it's a card bill expense, update the card statement
      if (expense.kind === 'CARD_BILL' && expense.linkedCardStatementId) {
        const statement = await storage.getCardStatementById(expense.linkedCardStatementId);
        if (statement) {
          const currentTotalDue = parseFloat(statement.totalDue);
          const expenseAmount = parseFloat(expense.amount);

          if (expense.status === 'pending') {
            // Expense was added to totalDue when created, so subtract to undo
            const newTotalDue = Math.max(0, currentTotalDue - expenseAmount).toFixed(2);

            await storage.updateCardStatement(statement.id, {
              totalDue: newTotalDue,
            });
          } else {
            // Expense is 'done' - was already subtracted from totalDue when paid
            // Don't change totalDue, just reset statement status and balance
            await storage.updateCardStatement(statement.id, {
              status: 'pending',
              paidDate: null,
            });

            // Reset balanceUsed
            const budget = await db.select().from(budgets).where(eq(budgets.id, expense.budgetId)).limit(1);
            if (budget.length > 0) {
              await storage.updateBudgetBalanceUsed(budget[0].id, '0');
            }
          }

          // Check if there are any other expenses linked to this statement
          const allExpenses = await storage.getExpenses(expense.budgetId);
          const otherCardExpenses = allExpenses.filter(
            exp => exp.kind === 'CARD_BILL' &&
                   exp.linkedCardStatementId === expense.linkedCardStatementId &&
                   exp.id !== expense.id
          );

          // If no other expenses linked to this statement, reset it to defaults
          if (otherCardExpenses.length === 0) {
            await storage.updateCardStatement(statement.id, {
              totalDue: '0',
              status: 'pending',
              paidDate: null,
            });
          }
        }
      }

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

  // Cash-Out Planner - Reset cash-out plan
  app.delete('/api/budgets/:year/:month/cash-out', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);

      // Get budget
      const budget = await storage.getBudget(userId, year, month);
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }

      // Delete all cash-out incomes
      const existingIncomes = await storage.getIncomes(budget.id);
      for (const income of existingIncomes) {
        if (income.source.startsWith('Cash-out –')) {
          await storage.deleteIncome(income.id);
        }
      }

      // Reset balance used to 0
      await storage.updateBudgetBalanceUsed(budget.id, '0');

      res.json({ message: "Cash-out plan reset successfully" });
    } catch (error) {
      console.error("Error resetting cash-out plan:", error);
      res.status(500).json({ message: "Failed to reset cash-out plan" });
    }
  });

  // Cash-Out Planner - Apply withdrawals
  app.post('/api/budgets/:year/:month/cash-out', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      const { withdrawals, balance } = req.body;

      if (!Array.isArray(withdrawals)) {
        return res.status(400).json({ message: "Invalid withdrawals data" });
      }

      // Get or create budget
      let budget = await storage.getBudget(userId, year, month);
      if (!budget) {
        budget = await storage.createBudget({ userId, year, month });
      }

      console.log(`[CASH-OUT] Applying cash-out plan for budget ${budget.id}, ${withdrawals.length} withdrawals`);

      // Get existing incomes to check for duplicates
      const existingIncomes = await storage.getIncomes(budget.id);

      // Get existing cash-out total
      const existingBalanceUsed = parseFloat(budget.balanceUsed || '0');

      // Calculate new total cash-out amount
      let newCashOut = 0;

      // Create cash-out incomes for each withdrawal
      // These are tracked as incomes to increase the balance
      for (const withdrawal of withdrawals) {
        const card = await storage.getCardById(withdrawal.cardId);
        if (!card) {
          console.log(`[CASH-OUT] Card not found: ${withdrawal.cardId}`);
          continue;
        }

        console.log(`[CASH-OUT] Processing withdrawal from ${card.nickname}: ${withdrawal.amount}`);

        // Check if cash-out income already exists for this card
        const existingCashOut = existingIncomes.find(inc => inc.source === `Cash-out – ${card.nickname}`);
        if (existingCashOut) {
          console.log(`[CASH-OUT] Updating existing cash-out income for ${card.nickname}`);
          // Update existing income amount
          const newAmount = (parseFloat(existingCashOut.amount) + withdrawal.amount).toString();
          await storage.updateIncome(existingCashOut.id, {
            source: existingCashOut.source,
            amount: newAmount,
            recurring: false,
          });
        } else {
          console.log(`[CASH-OUT] Creating new cash-out income for ${card.nickname}`);
          // Create new income
          await storage.createIncome({
            budgetId: budget.id,
            source: `Cash-out – ${card.nickname}`,
            amount: withdrawal.amount.toString(),
            recurring: false,
            status: 'done', // Mark as done immediately (money withdrawn)
            paidDate: new Date().toISOString().split('T')[0],
          });
        }

        newCashOut += withdrawal.amount;
      }

      // Add new cash-out to existing total
      const totalCashOut = existingBalanceUsed + newCashOut;
      await storage.updateBudgetBalanceUsed(budget.id, totalCashOut.toString());

      console.log(`[CASH-OUT] Cash-out plan applied successfully. Total: ${totalCashOut}`);
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

      // Calculate next month
      let nextYear = year;
      let nextMonth = month + 1;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }

      // Check if next month budget already exists
      const existingBudget = await storage.getBudget(userId, nextYear, nextMonth);
      if (existingBudget) {
        return res.status(400).json({ message: "Next month budget already exists" });
      }

      // Create next month budget
      const newBudget = await storage.createBudget({ userId, year: nextYear, month: nextMonth });

      // Get recurring incomes and expenses from current month
      const recurringIncomes = await storage.getRecurringIncomes(userId, year, month);
      const recurringExpenses = await storage.getRecurringExpenses(userId, year, month);

      // Copy recurring incomes to next month
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

      // Copy recurring expenses to next month
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

      // Get all loans and add as expenses
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

      // Get all credit cards and predict next month's statement dates
      const cards = await storage.getCreditCards(userId);
      for (const card of cards) {
        // Create date string for current month's statement day
        const currentStatementDay = Math.min(card.statementDay, getDaysInMonth(year, month));
        const currentDueDay = Math.min(card.dueDay, getDaysInMonth(year, month));
        
        // For next month, predict statement and due dates
        const nextStatementDay = Math.min(card.statementDay, getDaysInMonth(nextYear, nextMonth));
        
        // Calculate next month due date by adding day difference
        const statementDate = new Date(nextYear, nextMonth - 1, nextStatementDay);
        const dueDate = new Date(statementDate);
        dueDate.setDate(dueDate.getDate() + card.dayDifference);
        
        // Create card statement with default values (user can edit)
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

  const httpServer = createServer(app);
  return httpServer;
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
