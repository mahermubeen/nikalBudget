import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { KPICard } from "@/components/KPICard";
import { IncomeList } from "@/components/IncomeList";
import { ExpenseList } from "@/components/ExpenseList";
import { CardsList } from "@/components/CardsList";
import { LoansList } from "@/components/LoansList";
import { AddIncomeDialog } from "@/components/AddIncomeDialog";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { AddCardDialog } from "@/components/AddCardDialog";
import { AddLoanDialog } from "@/components/AddLoanDialog";
import { CashOutPlanner } from "@/components/CashOutPlanner";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/currency";
import { Loader2, TrendingDown, Wallet, CreditCard, Calculator, ArrowRight } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Budget, Income, Expense, CreditCard as Card, Loan } from "@shared/schema";

interface BudgetData {
  budget: Budget;
  incomes: Income[];
  expenses: Expense[];
  cardStatements: any[];
  totals: {
    incomeTotal: number;
    cardsTotal: number;
    nonCardExpensesTotal: number;
    afterCardPayments: number;
    need: number;
  };
}

interface CardsData {
  cards: Card[];
}

interface LoansData {
  loans: Loan[];
}

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // Current month state
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Dialog states
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [showCashOutPlanner, setShowCashOutPlanner] = useState(false);

  // Edit states - track which item is being edited
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [user, authLoading, toast]);

  const currencyCode = user?.currencyCode || 'PKR';

  // Fetch budget data for current month
  const { data: budgetData, isLoading: budgetLoading } = useQuery<BudgetData>({
    queryKey: ['/api/budgets', year, month],
    enabled: !!user,
  });

  // Fetch credit cards
  const { data: cardsData } = useQuery<CardsData>({
    queryKey: ['/api/cards'],
    enabled: !!user,
  });

  // Fetch loans
  const { data: loansData } = useQuery<LoansData>({
    queryKey: ['/api/loans'],
    enabled: !!user,
  });

  const budget = budgetData?.budget;
  const incomes = budgetData?.incomes || [];
  const expenses = budgetData?.expenses || [];
  const totals = budgetData?.totals || {
    incomeTotal: 0,
    cardsTotal: 0,
    nonCardExpensesTotal: 0,
    afterCardPayments: 0,
    need: 0,
  };
  const cards = cardsData?.cards || [];
  const loans = loansData?.loans || [];

  // Calculate KPIs
  const incomeTotal = totals.incomeTotal;
  const cardsTotal = totals.cardsTotal;
  const nonCardExpensesTotal = totals.nonCardExpensesTotal;
  const afterCardPayments = totals.afterCardPayments;
  const need = totals.need;

  // Month navigation
  const handlePreviousMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  // Add income mutation
  const addIncome = useMutation({
    mutationFn: async (data: { source: string; amount: string; recurring: boolean }) => {
      await apiRequest('POST', `/api/budgets/${year}/${month}/incomes`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets', year, month] });
      setShowAddIncome(false);
      toast({ title: "Income added successfully" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to add income", variant: "destructive" });
    },
  });

  // Add expense mutation
  const addExpense = useMutation({
    mutationFn: async (data: { label: string; amount: string; recurring: boolean }) => {
      await apiRequest('POST', `/api/budgets/${year}/${month}/expenses`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets', year, month] });
      setShowAddExpense(false);
      toast({ title: "Expense added successfully" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to add expense", variant: "destructive" });
    },
  });

  // Add card mutation
  const addCard = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest('POST', '/api/cards', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cards'] });
      setShowAddCard(false);
      toast({ title: "Credit card added successfully" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to add card", variant: "destructive" });
    },
  });

  // Add loan mutation
  const addLoan = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest('POST', '/api/loans', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/loans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/budgets', year, month] });
      setShowAddLoan(false);
      toast({ title: "Loan added successfully" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to add loan", variant: "destructive" });
    },
  });

  // Toggle income status mutation
  const toggleIncomeStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === 'done' ? 'pending' : 'done';
      await apiRequest('PATCH', `/api/incomes/${id}/status`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets', year, month] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    },
  });

  // Delete income mutation
  const deleteIncome = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/incomes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets', year, month] });
      toast({ title: "Income deleted successfully" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to delete income", variant: "destructive" });
    },
  });

  // Toggle expense status mutation
  const toggleExpenseStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === 'done' ? 'pending' : 'done';
      await apiRequest('PATCH', `/api/expenses/${id}/status`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets', year, month] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    },
  });

  // Delete expense mutation
  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets', year, month] });
      toast({ title: "Expense deleted successfully" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to delete expense", variant: "destructive" });
    },
  });

  // Delete credit card mutation
  const deleteCreditCard = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/cards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cards'] });
      toast({ title: "Credit card deleted successfully" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to delete card", variant: "destructive" });
    },
  });

  // Delete loan mutation
  const deleteLoan = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/loans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/loans'] });
      toast({ title: "Loan deleted successfully" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to delete loan", variant: "destructive" });
    },
  });

  // Apply cash-out plan mutation
  const applyCashOutPlan = useMutation({
    mutationFn: async (withdrawals: { cardId: string; amount: number }[]) => {
      await apiRequest('POST', `/api/budgets/${year}/${month}/cash-out`, { withdrawals });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets', year, month] });
      setShowCashOutPlanner(false);
      toast({ title: "Cash-out plan applied successfully" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to apply cash-out plan", variant: "destructive" });
    },
  });

  // Create next month mutation
  const createNextMonth = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/budgets/${year}/${month}/create-next`);
    },
    onSuccess: () => {
      // Move to next month
      handleNextMonth();
      toast({ title: "Next month created with recurring items" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to create next month", variant: "destructive" });
    },
  });

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  // Prepare card options for cash-out planner
  const cardOptions = budgetData?.cardStatements?.map((stmt: any) => ({
    id: stmt.cardId,
    nickname: stmt.cardNickname,
    availableLimit: parseFloat(stmt.availableLimit),
    dueDate: stmt.dueDate,
  })) || [];

  return (
    <div className="min-h-screen flex flex-col">
      <Header onLogout={handleLogout} />
      
      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
        <MonthSwitcher 
          year={year}
          month={month}
          onPrevious={handlePreviousMonth}
          onNext={handleNextMonth}
        />

        {budgetLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                label="Income"
                amount={formatCurrency(incomeTotal, currencyCode)}
                subtext={`${incomes.length} item${incomes.length !== 1 ? 's' : ''}`}
                icon={Wallet}
                variant="success"
                data-testid="kpi-income"
              />
              <KPICard
                label="Cards Total"
                amount={formatCurrency(cardsTotal, currencyCode)}
                subtext="Due this month"
                icon={CreditCard}
                data-testid="kpi-cards"
              />
              <KPICard
                label="Non-Card Expenses"
                amount={formatCurrency(nonCardExpensesTotal, currencyCode)}
                subtext="Regular expenses"
                icon={TrendingDown}
                data-testid="kpi-non-card"
              />
              <KPICard
                label="After Cards"
                amount={formatCurrency(afterCardPayments, currencyCode)}
                subtext="Income - Cards"
                variant={afterCardPayments >= 0 ? 'success' : 'danger'}
                data-testid="kpi-after-cards"
              />
            </div>

            {/* Need / Cash-Out Section */}
            {need > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">Cash-Out Needed</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      You need <span className="font-mono font-bold text-yellow-600 dark:text-yellow-500" data-testid="text-need-amount">
                        {formatCurrency(need, currencyCode)}
                      </span> to cover non-card expenses
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowCashOutPlanner(true)}
                    className="w-full sm:w-auto h-12"
                    data-testid="button-open-planner"
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    Plan Cash-Out
                  </Button>
                </div>
              </div>
            )}

            {/* Income & Expenses */}
            <div className="grid lg:grid-cols-2 gap-6">
              <IncomeList
                incomes={incomes}
                currencyCode={currencyCode}
                onAdd={() => setShowAddIncome(true)}
                onToggleStatus={(id, status) => toggleIncomeStatus.mutate({ id, status })}
                onEdit={(income) => {
                  setEditingIncome(income);
                  setShowAddIncome(true);
                }}
                onDelete={(id) => {
                  if (confirm('Are you sure you want to delete this income?')) {
                    deleteIncome.mutate(id);
                  }
                }}
              />
              
              <ExpenseList
                expenses={expenses}
                currencyCode={currencyCode}
                onAdd={() => setShowAddExpense(true)}
                onToggleStatus={(id, status) => toggleExpenseStatus.mutate({ id, status })}
                onEdit={(expense) => {
                  setEditingExpense(expense);
                  setShowAddExpense(true);
                }}
                onDelete={(id) => {
                  if (confirm('Are you sure you want to delete this expense?')) {
                    deleteExpense.mutate(id);
                  }
                }}
              />
            </div>

            {/* Cards & Loans */}
            <div className="grid lg:grid-cols-2 gap-6">
              <CardsList
                cards={cards}
                onAdd={() => setShowAddCard(true)}
              />
              
              <LoansList
                loans={loans}
                currencyCode={currencyCode}
                onAdd={() => setShowAddLoan(true)}
              />
            </div>

            {/* Create Next Month */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => createNextMonth.mutate()}
                disabled={createNextMonth.isPending}
                className="h-12"
                data-testid="button-create-next-month"
              >
                {createNextMonth.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Create Next Month
              </Button>
            </div>
          </div>
        )}
      </main>

      <Footer />

      {/* Dialogs */}
      <AddIncomeDialog
        open={showAddIncome}
        onOpenChange={setShowAddIncome}
        onAdd={(data) => addIncome.mutate(data)}
        isPending={addIncome.isPending}
      />

      <AddExpenseDialog
        open={showAddExpense}
        onOpenChange={setShowAddExpense}
        onAdd={(data) => addExpense.mutate(data)}
        isPending={addExpense.isPending}
      />

      <AddCardDialog
        open={showAddCard}
        onOpenChange={setShowAddCard}
        onAdd={(data) => addCard.mutate(data)}
        isPending={addCard.isPending}
      />

      <AddLoanDialog
        open={showAddLoan}
        onOpenChange={setShowAddLoan}
        onAdd={(data) => addLoan.mutate(data)}
        isPending={addLoan.isPending}
      />

      <CashOutPlanner
        open={showCashOutPlanner}
        onOpenChange={setShowCashOutPlanner}
        cards={cardOptions}
        need={need}
        currencyCode={currencyCode}
        onApply={(withdrawals) => applyCashOutPlan.mutate(withdrawals)}
        isPending={applyCashOutPlan.isPending}
      />
    </div>
  );
}
