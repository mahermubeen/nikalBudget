import {
  users,
  creditCards,
  cardStatements,
  loans,
  budgets,
  incomes,
  expenses,
  type User,
  type UpsertUser,
  type CreditCard,
  type InsertCreditCard,
  type CardStatement,
  type InsertCardStatement,
  type Loan,
  type InsertLoan,
  type Budget,
  type InsertBudget,
  type Income,
  type InsertIncome,
  type Expense,
  type InsertExpense,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, asc, max, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserCurrency(id: string, currencyCode: string): Promise<void>;
  
  // Credit card operations
  getCreditCards(userId: string): Promise<CreditCard[]>;
  createCreditCard(userId: string, card: InsertCreditCard): Promise<CreditCard>;
  updateCreditCard(id: string, card: Partial<InsertCreditCard>): Promise<void>;
  deleteCreditCard(id: string): Promise<void>;
  updateCardsOrder(items: { id: string; displayOrder: number }[]): Promise<void>;
  
  // Card statement operations
  getCardStatements(cardId: string, year: number, month: number): Promise<CardStatement[]>;
  getCardStatementsForMonth(userId: string, year: number, month: number): Promise<any[]>;
  getCardStatementsDueInMonth(userId: string, year: number, month: number): Promise<any[]>;
  getAllCardStatements(cardId: string): Promise<CardStatement[]>;
  getCardStatementById(id: string): Promise<CardStatement | undefined>;
  createCardStatement(statement: InsertCardStatement): Promise<CardStatement>;
  updateCardStatement(id: string, statement: Partial<InsertCardStatement>): Promise<void>;
  getCardById(cardId: string): Promise<CreditCard | undefined>;
  
  // Loan operations
  getLoans(userId: string): Promise<Loan[]>;
  createLoan(userId: string, loan: InsertLoan): Promise<Loan>;
  updateLoan(id: string, loan: Partial<InsertLoan>): Promise<void>;
  deleteLoan(id: string): Promise<void>;
  updateLoansOrder(items: { id: string; displayOrder: number }[]): Promise<void>;
  
  // Budget operations
  getBudget(userId: string, year: number, month: number): Promise<Budget | undefined>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  updateBudgetBalanceUsed(budgetId: string, balanceUsed: string): Promise<void>;
  
  // Income operations
  getIncomes(budgetId: string): Promise<Income[]>;
  createIncome(income: InsertIncome): Promise<Income>;
  updateIncomeStatus(id: string, status: string, paidDate?: string): Promise<void>;
  updateIncome(id: string, income: Partial<InsertIncome>): Promise<void>;
  deleteIncome(id: string): Promise<void>;
  updateIncomesOrder(items: { id: string; displayOrder: number }[]): Promise<void>;
  
  // Expense operations
  getExpenses(budgetId: string): Promise<Expense[]>;
  getExpenseById(id: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpenseStatus(id: string, status: string, paidDate?: string): Promise<void>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<void>;
  deleteExpense(id: string): Promise<void>;
  updateExpensesOrder(items: { id: string; displayOrder: number }[]): Promise<void>;
  
  // Get recurring items for next month creation
  getRecurringIncomes(userId: string, year: number, month: number): Promise<Income[]>;
  getRecurringExpenses(userId: string, year: number, month: number): Promise<Expense[]>;

  // Copy recurring items to future months
  copyRecurringIncomeToFutureMonths(userId: string, year: number, month: number, income: Income): Promise<void>;
  copyRecurringExpenseToFutureMonths(userId: string, year: number, month: number, expense: Expense): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserCurrency(id: string, currencyCode: string): Promise<void> {
    await db
      .update(users)
      .set({ currencyCode, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  // Credit card operations
  async getCreditCards(userId: string): Promise<CreditCard[]> {
    return db.select().from(creditCards).where(eq(creditCards.userId, userId)).orderBy(asc(creditCards.displayOrder), asc(creditCards.createdAt));
  }

  async createCreditCard(userId: string, card: InsertCreditCard): Promise<CreditCard> {
    // Get max displayOrder for this user's cards
    const result = await db
      .select({ maxOrder: max(creditCards.displayOrder) })
      .from(creditCards)
      .where(eq(creditCards.userId, userId));
    const maxOrder = result[0]?.maxOrder ?? -1;

    const [newCard] = await db
      .insert(creditCards)
      .values({ ...card, userId, displayOrder: maxOrder + 1 })
      .returning();
    return newCard;
  }

  async updateCreditCard(id: string, card: Partial<InsertCreditCard>): Promise<void> {
    await db
      .update(creditCards)
      .set({ ...card })
      .where(eq(creditCards.id, id));
  }

  async deleteCreditCard(id: string): Promise<void> {
    await db.delete(creditCards).where(eq(creditCards.id, id));
  }

  // Card statement operations
  async getCardStatements(cardId: string, year: number, month: number): Promise<CardStatement[]> {
    return db
      .select()
      .from(cardStatements)
      .where(
        and(
          eq(cardStatements.cardId, cardId),
          eq(cardStatements.year, year),
          eq(cardStatements.month, month)
        )
      );
  }

  async getCardStatementsForMonth(userId: string, year: number, month: number): Promise<any[]> {
    // Join with cards to get card nickname
    const results = await db
      .select({
        id: cardStatements.id,
        cardId: cardStatements.cardId,
        cardNickname: creditCards.nickname,
        year: cardStatements.year,
        month: cardStatements.month,
        statementDate: cardStatements.statementDate,
        dueDate: cardStatements.dueDate,
        totalDue: cardStatements.totalDue,
        minimumDue: cardStatements.minimumDue,
        availableLimit: cardStatements.availableLimit,
        status: cardStatements.status,
        paidDate: cardStatements.paidDate,
      })
      .from(cardStatements)
      .innerJoin(creditCards, eq(cardStatements.cardId, creditCards.id))
      .where(
        and(
          eq(creditCards.userId, userId),
          eq(cardStatements.year, year),
          eq(cardStatements.month, month)
        )
      );
    return results;
  }

  async getCardStatementsDueInMonth(userId: string, year: number, month: number): Promise<any[]> {
    // Get all card statements for this user
    const allStatements = await db
      .select({
        id: cardStatements.id,
        cardId: cardStatements.cardId,
        cardNickname: creditCards.nickname,
        year: cardStatements.year,
        month: cardStatements.month,
        statementDate: cardStatements.statementDate,
        dueDate: cardStatements.dueDate,
        totalDue: cardStatements.totalDue,
        minimumDue: cardStatements.minimumDue,
        availableLimit: cardStatements.availableLimit,
        status: cardStatements.status,
        paidDate: cardStatements.paidDate,
      })
      .from(cardStatements)
      .innerJoin(creditCards, eq(cardStatements.cardId, creditCards.id))
      .where(eq(creditCards.userId, userId));

    // Filter by due date falling in the target month (include all statuses)
    const targetMonthStart = new Date(year, month - 1, 1);
    const targetMonthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    return allStatements.filter(stmt => {
      const dueDate = new Date(stmt.dueDate + 'T00:00:00');
      return dueDate >= targetMonthStart && dueDate <= targetMonthEnd;
    });
  }

  async getAllCardStatements(cardId: string): Promise<CardStatement[]> {
    return db.select().from(cardStatements).where(eq(cardStatements.cardId, cardId));
  }

  async getCardStatementById(id: string): Promise<CardStatement | undefined> {
    const [statement] = await db.select().from(cardStatements).where(eq(cardStatements.id, id));
    return statement;
  }

  async createCardStatement(statement: InsertCardStatement): Promise<CardStatement> {
    const [newStatement] = await db
      .insert(cardStatements)
      .values(statement)
      .returning();
    return newStatement;
  }

  async updateCardStatement(id: string, statement: Partial<InsertCardStatement>): Promise<void> {
    await db
      .update(cardStatements)
      .set(statement)
      .where(eq(cardStatements.id, id));
  }

  async getCardById(cardId: string): Promise<CreditCard | undefined> {
    const [card] = await db.select().from(creditCards).where(eq(creditCards.id, cardId));
    return card;
  }

  // Loan operations
  async getLoans(userId: string): Promise<Loan[]> {
    return db.select().from(loans).where(eq(loans.userId, userId)).orderBy(asc(loans.displayOrder), asc(loans.createdAt));
  }

  async createLoan(userId: string, loan: InsertLoan): Promise<Loan> {
    // Get max displayOrder for this user's loans
    const result = await db
      .select({ maxOrder: max(loans.displayOrder) })
      .from(loans)
      .where(eq(loans.userId, userId));
    const maxOrder = result[0]?.maxOrder ?? -1;

    const [newLoan] = await db
      .insert(loans)
      .values({ ...loan, userId, displayOrder: maxOrder + 1 })
      .returning();
    return newLoan;
  }

  async updateLoan(id: string, loan: Partial<InsertLoan>): Promise<void> {
    await db
      .update(loans)
      .set({ ...loan })
      .where(eq(loans.id, id));
  }

  async deleteLoan(id: string): Promise<void> {
    await db.delete(loans).where(eq(loans.id, id));
  }

  // Budget operations
  async getBudget(userId: string, year: number, month: number): Promise<Budget | undefined> {
    const [budget] = await db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.userId, userId),
          eq(budgets.year, year),
          eq(budgets.month, month)
        )
      );
    return budget;
  }

  async createBudget(budget: InsertBudget): Promise<Budget> {
    const [newBudget] = await db
      .insert(budgets)
      .values(budget)
      .returning();
    return newBudget;
  }

  async updateBudgetBalanceUsed(budgetId: string, balanceUsed: string): Promise<void> {
    await db
      .update(budgets)
      .set({ balanceUsed })
      .where(eq(budgets.id, budgetId));
  }

  // Income operations
  async getIncomes(budgetId: string): Promise<Income[]> {
    return db.select().from(incomes).where(eq(incomes.budgetId, budgetId)).orderBy(asc(incomes.displayOrder), asc(incomes.createdAt));
  }

  async createIncome(income: InsertIncome): Promise<Income> {
    // Get max displayOrder for this budget's incomes
    const result = await db
      .select({ maxOrder: max(incomes.displayOrder) })
      .from(incomes)
      .where(eq(incomes.budgetId, income.budgetId));
    const maxOrder = result[0]?.maxOrder ?? -1;

    const [newIncome] = await db
      .insert(incomes)
      .values({ ...income, displayOrder: maxOrder + 1 })
      .returning();
    return newIncome;
  }

  async updateIncomeStatus(id: string, status: string, paidDate?: string): Promise<void> {
    await db
      .update(incomes)
      .set({
        status,
        paidDate: status === 'done' ? (paidDate || new Date().toISOString().split('T')[0]) : null
      })
      .where(eq(incomes.id, id));
  }

  async updateIncome(id: string, income: Partial<InsertIncome>): Promise<void> {
    await db
      .update(incomes)
      .set(income)
      .where(eq(incomes.id, id));
  }

  async deleteIncome(id: string): Promise<void> {
    await db.delete(incomes).where(eq(incomes.id, id));
  }

  // Expense operations
  async getExpenses(budgetId: string): Promise<Expense[]> {
    return db.select().from(expenses).where(eq(expenses.budgetId, budgetId)).orderBy(asc(expenses.displayOrder), asc(expenses.createdAt));
  }

  async getExpenseById(id: string): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense;
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    // Get max displayOrder for this budget's expenses
    const result = await db
      .select({ maxOrder: max(expenses.displayOrder) })
      .from(expenses)
      .where(eq(expenses.budgetId, expense.budgetId));
    const maxOrder = result[0]?.maxOrder ?? -1;

    const [newExpense] = await db
      .insert(expenses)
      .values({ ...expense, displayOrder: maxOrder + 1 })
      .returning();
    return newExpense;
  }

  async updateExpenseStatus(id: string, status: string, paidDate?: string): Promise<void> {
    await db
      .update(expenses)
      .set({
        status,
        paidDate: status === 'done' ? (paidDate || new Date().toISOString().split('T')[0]) : null
      })
      .where(eq(expenses.id, id));
  }

  async updateExpense(id: string, expense: Partial<InsertExpense>): Promise<void> {
    await db
      .update(expenses)
      .set(expense)
      .where(eq(expenses.id, id));
  }

  async deleteExpense(id: string): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  // Get recurring items for next month creation
  async getRecurringIncomes(userId: string, year: number, month: number): Promise<Income[]> {
    // Get budget for this month
    const budget = await this.getBudget(userId, year, month);
    if (!budget) return [];

    // Get all incomes for this budget that are recurring
    return db
      .select()
      .from(incomes)
      .where(
        and(
          eq(incomes.budgetId, budget.id),
          eq(incomes.recurring, true)
        )
      );
  }

  async getRecurringExpenses(userId: string, year: number, month: number): Promise<Expense[]> {
    // Get budget for this month
    const budget = await this.getBudget(userId, year, month);
    if (!budget) return [];

    // Get all expenses for this budget that are recurring (excluding CARD_BILL and LOAN)
    return db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.budgetId, budget.id),
          eq(expenses.recurring, true),
          eq(expenses.kind, 'REGULAR')
        )
      );
  }

  async copyRecurringIncomeToFutureMonths(userId: string, year: number, month: number, income: Income): Promise<void> {
    // Get all budgets for this user
    const allBudgets = await db
      .select()
      .from(budgets)
      .where(eq(budgets.userId, userId))
      .orderBy(asc(budgets.year), asc(budgets.month));

    // Filter to only future months
    const futureBudgets = allBudgets.filter(b => {
      if (b.year > year) return true;
      if (b.year === year && b.month > month) return true;
      return false;
    });

    // For each future budget, check if this income already exists
    for (const futureBudget of futureBudgets) {
      // Check if an income with the same source already exists in this budget
      const existingIncomes = await db
        .select()
        .from(incomes)
        .where(
          and(
            eq(incomes.budgetId, futureBudget.id),
            eq(incomes.source, income.source),
            eq(incomes.recurring, true)
          )
        );

      // Only create if it doesn't exist
      if (existingIncomes.length === 0) {
        await this.createIncome({
          budgetId: futureBudget.id,
          source: income.source,
          amount: income.amount,
          recurring: true,
          status: 'pending',
          paidDate: null,
        });
      }
    }
  }

  async copyRecurringExpenseToFutureMonths(userId: string, year: number, month: number, expense: Expense): Promise<void> {
    // Get all budgets for this user
    const allBudgets = await db
      .select()
      .from(budgets)
      .where(eq(budgets.userId, userId))
      .orderBy(asc(budgets.year), asc(budgets.month));

    // Filter to only future months
    const futureBudgets = allBudgets.filter(b => {
      if (b.year > year) return true;
      if (b.year === year && b.month > month) return true;
      return false;
    });

    // For each future budget, check if this expense already exists
    for (const futureBudget of futureBudgets) {
      // Check if an expense with the same label already exists in this budget
      const existingExpenses = await db
        .select()
        .from(expenses)
        .where(
          and(
            eq(expenses.budgetId, futureBudget.id),
            eq(expenses.label, expense.label),
            eq(expenses.recurring, true),
            eq(expenses.kind, 'REGULAR')
          )
        );

      // Only create if it doesn't exist
      if (existingExpenses.length === 0) {
        await this.createExpense({
          budgetId: futureBudget.id,
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
    }
  }

  // Batch order update methods
  async updateCardsOrder(items: { id: string; displayOrder: number }[]): Promise<void> {
    for (const item of items) {
      await db
        .update(creditCards)
        .set({ displayOrder: item.displayOrder })
        .where(eq(creditCards.id, item.id));
    }
  }

  async updateLoansOrder(items: { id: string; displayOrder: number }[]): Promise<void> {
    for (const item of items) {
      await db
        .update(loans)
        .set({ displayOrder: item.displayOrder })
        .where(eq(loans.id, item.id));
    }
  }

  async updateIncomesOrder(items: { id: string; displayOrder: number }[]): Promise<void> {
    for (const item of items) {
      await db
        .update(incomes)
        .set({ displayOrder: item.displayOrder })
        .where(eq(incomes.id, item.id));
    }
  }

  async updateExpensesOrder(items: { id: string; displayOrder: number }[]): Promise<void> {
    for (const item of items) {
      await db
        .update(expenses)
        .set({ displayOrder: item.displayOrder })
        .where(eq(expenses.id, item.id));
    }
  }
}

export const storage = new DatabaseStorage();
