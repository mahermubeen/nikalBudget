import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  decimal,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - required for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  currencyCode: varchar("currency_code", { length: 3 }).default('PKR').notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  creditCards: many(creditCards),
  loans: many(loans),
  budgets: many(budgets),
}));

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Credit Cards table
export const creditCards = pgTable("credit_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  nickname: varchar("nickname", { length: 100 }).notNull(),
  issuer: varchar("issuer", { length: 100 }),
  last4: varchar("last4", { length: 4 }),
  statementDay: integer("statement_day").notNull(), // Day of month for statement (1-31) - kept for backward compatibility
  dueDay: integer("due_day").notNull(), // Day of month for due date (1-31) - kept for backward compatibility
  dayDifference: integer("day_difference").notNull(), // Days between statement and due
  firstStatementDate: date("first_statement_date"), // Actual first known statement date (nullable for backward compatibility)
  billingCycleDays: integer("billing_cycle_days").default(30), // Number of days in billing cycle (typically 28-30)
  totalLimit: decimal("total_limit", { precision: 12, scale: 2 }), // Total credit limit
  availableLimit: decimal("available_limit", { precision: 12, scale: 2 }), // Available limit for withdrawal
  createdAt: timestamp("created_at").defaultNow(),
});

export const creditCardsRelations = relations(creditCards, ({ one, many }) => ({
  user: one(users, {
    fields: [creditCards.userId],
    references: [users.id],
  }),
  statements: many(cardStatements),
}));

export const insertCreditCardSchema = createInsertSchema(creditCards).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type InsertCreditCard = z.infer<typeof insertCreditCardSchema>;
export type CreditCard = typeof creditCards.$inferSelect;

// Card Statements table (per month per card)
export const cardStatements = pgTable("card_statements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cardId: varchar("card_id").notNull().references(() => creditCards.id, { onDelete: 'cascade' }),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  statementDate: date("statement_date").notNull(),
  dueDate: date("due_date").notNull(),
  totalDue: decimal("total_due", { precision: 12, scale: 2 }).notNull(),
  minimumDue: decimal("minimum_due", { precision: 12, scale: 2 }).notNull(),
  availableLimit: decimal("available_limit", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default('pending'), // 'pending' | 'done'
  paidDate: date("paid_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cardStatementsRelations = relations(cardStatements, ({ one, many }) => ({
  card: one(creditCards, {
    fields: [cardStatements.cardId],
    references: [creditCards.id],
  }),
  expenses: many(expenses),
}));

export const insertCardStatementSchema = createInsertSchema(cardStatements).omit({
  id: true,
  createdAt: true,
});

export type InsertCardStatement = z.infer<typeof insertCardStatementSchema>;
export type CardStatement = typeof cardStatements.$inferSelect;

// Loans table
export const loans = pgTable("loans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 100 }).notNull(),
  installmentAmount: decimal("installment_amount", { precision: 12, scale: 2 }).notNull(),
  nextDueDate: date("next_due_date").notNull(),
  recurring: boolean("recurring").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const loansRelations = relations(loans, ({ one, many }) => ({
  user: one(users, {
    fields: [loans.userId],
    references: [users.id],
  }),
  expenses: many(expenses),
}));

export const insertLoanSchema = createInsertSchema(loans).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type InsertLoan = z.infer<typeof insertLoanSchema>;
export type Loan = typeof loans.$inferSelect;

// Monthly Budgets table
export const budgets = pgTable("budgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  balanceUsed: decimal("balance_used", { precision: 12, scale: 2 }).default('0').notNull(), // Balance used from afterCardPayments
  createdAt: timestamp("created_at").defaultNow(),
});

export const budgetsRelations = relations(budgets, ({ one, many }) => ({
  user: one(users, {
    fields: [budgets.userId],
    references: [users.id],
  }),
  incomes: many(incomes),
  expenses: many(expenses),
}));

export const insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
  createdAt: true,
});

export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgets.$inferSelect;

// Income items table
export const incomes = pgTable("incomes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  budgetId: varchar("budget_id").notNull().references(() => budgets.id, { onDelete: 'cascade' }),
  source: varchar("source", { length: 200 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  recurring: boolean("recurring").notNull().default(false),
  status: varchar("status", { length: 20 }).notNull().default('pending'), // 'pending' | 'done'
  paidDate: date("paid_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const incomesRelations = relations(incomes, ({ one }) => ({
  budget: one(budgets, {
    fields: [incomes.budgetId],
    references: [budgets.id],
  }),
}));

export const insertIncomeSchema = createInsertSchema(incomes).omit({
  id: true,
  createdAt: true,
});

export type InsertIncome = z.infer<typeof insertIncomeSchema>;
export type Income = typeof incomes.$inferSelect;

// Expense items table
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  budgetId: varchar("budget_id").notNull().references(() => budgets.id, { onDelete: 'cascade' }),
  label: varchar("label", { length: 200 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  recurring: boolean("recurring").notNull().default(false),
  status: varchar("status", { length: 20 }).notNull().default('pending'), // 'pending' | 'done'
  paidDate: date("paid_date"),
  kind: varchar("kind", { length: 20 }).notNull().default('REGULAR'), // 'REGULAR' | 'CARD_BILL' | 'LOAN'
  linkedCardStatementId: varchar("linked_card_statement_id").references(() => cardStatements.id, { onDelete: 'set null' }),
  linkedLoanId: varchar("linked_loan_id").references(() => loans.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expensesRelations = relations(expenses, ({ one }) => ({
  budget: one(budgets, {
    fields: [expenses.budgetId],
    references: [budgets.id],
  }),
  cardStatement: one(cardStatements, {
    fields: [expenses.linkedCardStatementId],
    references: [cardStatements.id],
  }),
  loan: one(loans, {
    fields: [expenses.linkedLoanId],
    references: [loans.id],
  }),
}));

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
});

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;
