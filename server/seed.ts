import "dotenv/config";
import { db } from "./db";
import {
  users,
  creditCards,
  cardStatements,
  loans,
  budgets,
  incomes,
  expenses
} from "@shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Starting seed...");

  try {
    // Note: In production, users are created via Replit Auth
    // This seed is for demo purposes - we'll create a test user
    
    // Check if demo user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'demo@budgetnikal.com'));

    let demoUser;
    if (existingUser) {
      console.log("Demo user already exists");
      demoUser = existingUser;
    } else {
      // Create demo user
      [demoUser] = await db
        .insert(users)
        .values({
          id: 'demo-user-123',
          email: 'demo@budgetnikal.com',
          firstName: 'Ahmed',
          lastName: 'Khan',
          currencyCode: 'PKR',
        })
        .returning();
      console.log("✅ Created demo user");
    }

    // Create credit cards
    const [jsBank] = await db
      .insert(creditCards)
      .values({
        userId: demoUser.id,
        nickname: 'JS Bank',
        issuer: 'JS Bank Limited',
        last4: '1234',
        statementDay: 15,
        dueDay: 25,
        dayDifference: 10,
      })
      .onConflictDoNothing()
      .returning();

    const [alfalahBank] = await db
      .insert(creditCards)
      .values({
        userId: demoUser.id,
        nickname: 'Alfalah Bank',
        issuer: 'Bank Alfalah',
        last4: '5678',
        statementDay: 10,
        dueDay: 28,
        dayDifference: 18,
      })
      .onConflictDoNothing()
      .returning();

    console.log("✅ Created credit cards");

    // Create loan
    const [faysalLoan] = await db
      .insert(loans)
      .values({
        userId: demoUser.id,
        name: 'Faysal Installment',
        installmentAmount: '15000',
        nextDueDate: '2025-09-05',
        recurring: true,
      })
      .onConflictDoNothing()
      .returning();

    console.log("✅ Created loan");

    // Create September 2025 budget
    const [septBudget] = await db
      .insert(budgets)
      .values({
        userId: demoUser.id,
        year: 2025,
        month: 9,
      })
      .onConflictDoNothing()
      .returning();

    // Create October 2025 budget
    const [octBudget] = await db
      .insert(budgets)
      .values({
        userId: demoUser.id,
        year: 2025,
        month: 10,
      })
      .onConflictDoNothing()
      .returning();

    console.log("✅ Created budgets for September and October 2025");

    if (septBudget && jsBank && alfalahBank && faysalLoan) {
      // September Income
      await db.insert(incomes).values([
        {
          budgetId: septBudget.id,
          source: 'Fuentes',
          amount: '180000',
          recurring: true,
          status: 'done',
          paidDate: '2025-09-01',
        },
      ]).onConflictDoNothing();

      // September Expenses
      await db.insert(expenses).values([
        {
          budgetId: septBudget.id,
          label: 'Kameeti',
          amount: '25000',
          recurring: true,
          status: 'done',
          paidDate: '2025-09-10',
          kind: 'REGULAR',
        },
        {
          budgetId: septBudget.id,
          label: 'Flat',
          amount: '35000',
          recurring: true,
          status: 'done',
          paidDate: '2025-09-05',
          kind: 'REGULAR',
        },
        {
          budgetId: septBudget.id,
          label: 'Electric',
          amount: '8000',
          recurring: true,
          status: 'done',
          paidDate: '2025-09-15',
          kind: 'REGULAR',
        },
        {
          budgetId: septBudget.id,
          label: 'Faysal Installment',
          amount: '15000',
          recurring: true,
          status: 'done',
          paidDate: '2025-09-05',
          kind: 'LOAN',
          linkedLoanId: faysalLoan.id,
        },
        {
          budgetId: septBudget.id,
          label: 'Kharcha',
          amount: '12000',
          recurring: true,
          status: 'done',
          paidDate: '2025-09-20',
          kind: 'REGULAR',
        },
        {
          budgetId: septBudget.id,
          label: 'Begum',
          amount: '20000',
          recurring: true,
          status: 'done',
          paidDate: '2025-09-18',
          kind: 'REGULAR',
        },
        {
          budgetId: septBudget.id,
          label: 'Mom',
          amount: '10000',
          recurring: true,
          status: 'done',
          paidDate: '2025-09-12',
          kind: 'REGULAR',
        },
      ]).onConflictDoNothing();

      // September Card Statements
      await db.insert(cardStatements).values([
        {
          cardId: jsBank.id,
          year: 2025,
          month: 9,
          statementDate: '2025-09-15',
          dueDate: '2025-09-25',
          totalDue: '45000',
          minimumDue: '4500',
          availableLimit: '200000',
          status: 'done',
          paidDate: '2025-09-24',
        },
        {
          cardId: alfalahBank.id,
          year: 2025,
          month: 9,
          statementDate: '2025-09-10',
          dueDate: '2025-09-28',
          totalDue: '32000',
          minimumDue: '3200',
          availableLimit: '150000',
          status: 'done',
          paidDate: '2025-09-27',
        },
      ]).onConflictDoNothing();

      console.log("✅ Created September 2025 data");
    }

    if (octBudget && jsBank && alfalahBank && faysalLoan) {
      // October Income
      await db.insert(incomes).values([
        {
          budgetId: octBudget.id,
          source: 'Fuentes',
          amount: '180000',
          recurring: true,
          status: 'pending',
          paidDate: null,
        },
      ]).onConflictDoNothing();

      // October Expenses
      await db.insert(expenses).values([
        {
          budgetId: octBudget.id,
          label: 'Kameeti',
          amount: '25000',
          recurring: true,
          status: 'pending',
          paidDate: null,
          kind: 'REGULAR',
        },
        {
          budgetId: octBudget.id,
          label: 'Flat',
          amount: '35000',
          recurring: true,
          status: 'done',
          paidDate: '2025-10-05',
          kind: 'REGULAR',
        },
        {
          budgetId: octBudget.id,
          label: 'Electric',
          amount: '9500',
          recurring: true,
          status: 'pending',
          paidDate: null,
          kind: 'REGULAR',
        },
        {
          budgetId: octBudget.id,
          label: 'Faysal Installment',
          amount: '15000',
          recurring: true,
          status: 'done',
          paidDate: '2025-10-05',
          kind: 'LOAN',
          linkedLoanId: faysalLoan.id,
        },
        {
          budgetId: octBudget.id,
          label: 'Kharcha',
          amount: '12000',
          recurring: true,
          status: 'pending',
          paidDate: null,
          kind: 'REGULAR',
        },
        {
          budgetId: octBudget.id,
          label: 'Begum',
          amount: '20000',
          recurring: true,
          status: 'pending',
          paidDate: null,
          kind: 'REGULAR',
        },
        {
          budgetId: octBudget.id,
          label: 'Mom',
          amount: '10000',
          recurring: true,
          status: 'pending',
          paidDate: null,
          kind: 'REGULAR',
        },
      ]).onConflictDoNothing();

      // October Card Statements
      await db.insert(cardStatements).values([
        {
          cardId: jsBank.id,
          year: 2025,
          month: 10,
          statementDate: '2025-10-15',
          dueDate: '2025-10-25',
          totalDue: '52000',
          minimumDue: '5200',
          availableLimit: '180000',
          status: 'pending',
          paidDate: null,
        },
        {
          cardId: alfalahBank.id,
          year: 2025,
          month: 10,
          statementDate: '2025-10-10',
          dueDate: '2025-10-28',
          totalDue: '38000',
          minimumDue: '3800',
          availableLimit: '140000',
          status: 'pending',
          paidDate: null,
        },
      ]).onConflictDoNothing();

      console.log("✅ Created October 2025 data");
    }

    console.log("🎉 Seed completed successfully!");
    console.log("\nDemo Account:");
    console.log("Email: demo@budgetnikal.com");
    console.log("User ID: demo-user-123");
    console.log("\nNote: When using Replit Auth, data will be associated with your authenticated user.");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
