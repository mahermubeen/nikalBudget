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
import { eq, and } from "drizzle-orm";

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
  
  // Card statement operations
  getCardStatements(cardId: string, year: number, month: number): Promise<CardStatement[]>;
  getCardStatementsForMonth(userId: string, year: number, month: number): Promise<any[]>;
  createCardStatement(statement: InsertCardStatement): Promise<CardStatement>;
  
  // Loan operations
  getLoans(userId: string): Promise<Loan[]>;
  createLoan(userId: string, loan: InsertLoan): Promise<Loan>;
  updateLoan(id: string, loan: Partial<InsertLoan>): Promise<void>;
  deleteLoan(id: string): Promise<void>;
  
  // Budget operations
  getBudget(userId: string, year: number, month: number): Promise<Budget | undefined>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  
  // Income operations
  getIncomes(budgetId: string): Promise<Income[]>;
  createIncome(income: InsertIncome): Promise<Income>;
  updateIncomeStatus(id: string, status: string, paidDate?: string): Promise<void>;
  updateIncome(id: string, income: Partial<InsertIncome>): Promise<void>;
  deleteIncome(id: string): Promise<void>;
  
  // Expense operations
  getExpenses(budgetId: string): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpenseStatus(id: string, status: string, paidDate?: string): Promise<void>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<void>;
  deleteExpense(id: string): Promise<void>;
  
  // Get recurring items for next month creation
  getRecurringIncomes(userId: string, year: number, month: number): Promise<Income[]>;
  getRecurringExpenses(userId: string, year: number, month: number): Promise<Expense[]>;
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
    return db.select().from(creditCards).where(eq(creditCards.userId, userId));
  }

  async createCreditCard(userId: string, card: InsertCreditCard): Promise<CreditCard> {
    const [newCard] = await db
      .insert(creditCards)
      .values({ ...card, userId })
      .returning();
    return newCard;
  }

  async updateCreditCard(id: string, card: Partial<InsertCreditCard>): Promise<void> {
    await db
      .update(creditCards)
      .set({ ...card, updatedAt: new Date() })
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

  async createCardStatement(statement: InsertCardStatement): Promise<CardStatement> {
    const [newStatement] = await db
      .insert(cardStatements)
      .values(statement)
      .returning();
    return newStatement;
  }

  // Loan operations
  async getLoans(userId: string): Promise<Loan[]> {
    return db.select().from(loans).where(eq(loans.userId, userId));
  }

  async createLoan(userId: string, loan: InsertLoan): Promise<Loan> {
    const [newLoan] = await db
      .insert(loans)
      .values({ ...loan, userId })
      .returning();
    return newLoan;
  }

  async updateLoan(id: string, loan: Partial<InsertLoan>): Promise<void> {
    await db
      .update(loans)
      .set({ ...loan, updatedAt: new Date() })
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

  // Income operations
  async getIncomes(budgetId: string): Promise<Income[]> {
    return db.select().from(incomes).where(eq(incomes.budgetId, budgetId));
  }

  async createIncome(income: InsertIncome): Promise<Income> {
    const [newIncome] = await db
      .insert(incomes)
      .values(income)
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
    return db.select().from(expenses).where(eq(expenses.budgetId, budgetId));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db
      .insert(expenses)
      .values(expense)
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
}

export const storage = new DatabaseStorage();
