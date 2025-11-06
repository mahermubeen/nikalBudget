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
import { CashOutHistory } from "@/components/CashOutHistory";
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
    totalExpenses: number;
    afterCardPayments: number;
    balanceUsed: number;
    balance: number;
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
  const [showCashOutHistory, setShowCashOutHistory] = useState(false);

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
    queryKey: ['/api/cards', year, month],
    queryFn: async () => {
      const res = await fetch(`/api/cards?year=${year}&month=${month}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return await res.json();
    },
    enabled: !!user,
  });

  // Fetch loans
  const { data: loansData } = useQuery<LoansData>({
    queryKey: ['/api/loans'],
    enabled: !!user,
  });

  // Check if next month budget exists
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const { data: nextMonthBudgetData } = useQuery<BudgetData>({
    queryKey: ['/api/budgets', nextYear, nextMonth],
    enabled: !!user,
    retry: false, // Don't retry if next month doesn't exist
  });

  const budget = budgetData?.budget;
  const incomes = budgetData?.incomes || [];
  const expenses = budgetData?.expenses || [];
  const totals = budgetData?.totals || {
    incomeTotal: 0,
    cardsTotal: 0,
    nonCardExpensesTotal: 0,
    totalExpenses: 0,
    afterCardPayments: 0,
    balanceUsed: 0,
    balance: 0,
    need: 0,
  };
  const cards = cardsData?.cards || [];
  const loans = loansData?.loans || [];

  // Calculate KPIs
  const incomeTotal = totals.incomeTotal;
  const cardsTotal = totals.cardsTotal;
  const nonCardExpensesTotal = totals.nonCardExpensesTotal;
  const totalExpenses = totals.totalExpenses;
  const afterCardPayments = totals.afterCardPayments;
  const balanceUsed = totals.balanceUsed;
  const balance = totals.balance;
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
    mutationFn: async (data: { label: string; amount: string; recurring: boolean; statementId?: string }) => {
      await apiRequest('POST', `/api/budgets/${year}/${month}/expenses`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets', year, month] });
      queryClient.invalidateQueries({ queryKey: ['/api/cards', year, month] }); // Refresh cards to update available limit
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
      queryClient.invalidateQueries({ queryKey: ['/api/cards', year, month] });
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

  // Update income mutation
  const updateIncome = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { source: string; amount: string; recurring: boolean } }) => {
      await apiRequest('PATCH', `/api/incomes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets', year, month] });
      setShowAddIncome(false);
      setEditingIncome(null);
      toast({ title: "Income updated successfully" });
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
      toast({ title: "Error", description: "Failed to update income", variant: "destructive" });
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

  // Reorder incomes mutation
  const reorderIncomes = useMutation({
    mutationFn: async (items: Income[]) => {
      const orderUpdates = items.map((item, index) => ({
        id: item.id,
        displayOrder: index,
      }));
      await apiRequest('POST', '/api/incomes/reorder', { items: orderUpdates });
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
      toast({ title: "Error", description: "Failed to reorder incomes", variant: "destructive" });
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
      queryClient.invalidateQueries({ queryKey: ['/api/cards', year, month] }); // Refresh cards and statements
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

  // Update expense mutation
  const updateExpense = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { label: string; amount: string; recurring: boolean } }) => {
      await apiRequest('PATCH', `/api/expenses/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets', year, month] });
      setShowAddExpense(false);
      setEditingExpense(null);
      toast({ title: "Expense updated successfully" });
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
      toast({ title: "Error", description: "Failed to update expense", variant: "destructive" });
    },
  });

  // Delete expense mutation
  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets', year, month] });
      queryClient.invalidateQueries({ queryKey: ['/api/cards', year, month] }); // Refresh cards to update available limit
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

  // Reorder expenses mutation
  const reorderExpenses = useMutation({
    mutationFn: async (items: Expense[]) => {
      const orderUpdates = items.map((item, index) => ({
        id: item.id,
        displayOrder: index,
      }));
      await apiRequest('POST', '/api/expenses/reorder', { items: orderUpdates });
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
      toast({ title: "Error", description: "Failed to reorder expenses", variant: "destructive" });
    },
  });

  // Update credit card mutation
  const updateCreditCard = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest('PATCH', `/api/cards/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cards', year, month] });
      setShowAddCard(false);
      setEditingCard(null);
      toast({ title: "Credit card updated successfully" });
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
      toast({ title: "Error", description: "Failed to update card", variant: "destructive" });
    },
  });

  // Delete credit card mutation
  const deleteCreditCard = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/cards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cards', year, month] });
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

  // Reorder cards mutation
  const reorderCards = useMutation({
    mutationFn: async (items: Card[]) => {
      const orderUpdates = items.map((item, index) => ({
        id: item.id,
        displayOrder: index,
      }));
      await apiRequest('POST', '/api/cards/reorder', { items: orderUpdates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cards', year, month] });
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
      toast({ title: "Error", description: "Failed to reorder cards", variant: "destructive" });
    },
  });

  // Update loan mutation
  const updateLoan = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest('PATCH', `/api/loans/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/loans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/budgets', year, month] });
      setShowAddLoan(false);
      setEditingLoan(null);
      toast({ title: "Loan updated successfully" });
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
      toast({ title: "Error", description: "Failed to update loan", variant: "destructive" });
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

  // Reorder loans mutation
  const reorderLoans = useMutation({
    mutationFn: async (items: Loan[]) => {
      const orderUpdates = items.map((item, index) => ({
        id: item.id,
        displayOrder: index,
      }));
      await apiRequest('POST', '/api/loans/reorder', { items: orderUpdates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/loans'] });
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
      toast({ title: "Error", description: "Failed to reorder loans", variant: "destructive" });
    },
  });

  // Apply cash-out plan mutation
  const applyCashOutPlan = useMutation({
    mutationFn: async ({ withdrawals, balance }: { withdrawals: { cardId: string; amount: number }[]; balance: number }) => {
      await apiRequest('POST', `/api/budgets/${year}/${month}/cash-out`, { withdrawals, balance });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets', year, month] });
      queryClient.invalidateQueries({ queryKey: ['/api/cards', year, month] }); // Refresh cards to update available limit
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

  // Reset cash-out plan mutation
  const resetCashOutPlan = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/budgets/${year}/${month}/cash-out`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets', year, month] });
      queryClient.invalidateQueries({ queryKey: ['/api/cards', year, month] });
      setShowCashOutHistory(false);
      toast({ title: "Cash-out plan reset successfully" });
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
      toast({ title: "Error", description: "Failed to reset cash-out plan", variant: "destructive" });
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
  // Use cards directly with their available limits (not from statements)
  const cardOptions = cards
    .filter((card: Card) => card.availableLimit && parseFloat(card.availableLimit) > 0)
    .map((card: Card) => {
      // Construct a due date for the current month based on card's dueDay
      const dueDate = new Date(year, month - 1, card.dueDay);
      return {
        id: card.id,
        nickname: card.nickname,
        availableLimit: parseFloat(card.availableLimit || '0'),
        dueDate: dueDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
      };
    });

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
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${
              // Show 6 columns when there are unpaid card expenses, otherwise 5
              expenses.some(exp => exp.kind === 'CARD_BILL' && exp.status === 'pending') ? 'xl:grid-cols-6' : 'xl:grid-cols-5'
            }`}>
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
                label="Total Expenses"
                amount={formatCurrency(totalExpenses, currencyCode)}
                subtext="Cards + Non-Cards"
                icon={TrendingDown}
                variant="danger"
                data-testid="kpi-total-expenses"
              />
              {/* Show "After Cards" only when there are unpaid card expenses */}
              {expenses.some(exp => exp.kind === 'CARD_BILL' && exp.status === 'pending') && (
                <KPICard
                  label="After Cards"
                  amount={formatCurrency(afterCardPayments, currencyCode)}
                  subtext="Income - Cards"
                  variant={afterCardPayments >= 0 ? 'success' : 'danger'}
                  data-testid="kpi-after-cards"
                />
              )}
              <KPICard
                label="Balance"
                amount={formatCurrency(balance, currencyCode)}
                subtext="Account balance"
                icon={Wallet}
                variant={balance >= 0 ? 'success' : 'danger'}
                data-testid="kpi-balance"
              />
            </div>

            {/* Cash-Out Section - Show when there are cards with available limits */}
            {cardOptions.length > 0 && (
              <div className={`${need > 0 ? 'bg-yellow-500/10 border-yellow-500/30' : balanceUsed > 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'} border rounded-lg p-6`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    {need > 0 ? (
                      <>
                        <h3 className="text-lg font-semibold">Cash-Out Needed</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          You need <span className="font-mono font-bold text-yellow-600 dark:text-yellow-500" data-testid="text-need-amount">
                            {formatCurrency(need, currencyCode)}
                          </span> to cover non-card expenses
                        </p>
                      </>
                    ) : balanceUsed > 0 ? (
                      <>
                        <h3 className="text-lg font-semibold">Cash-Out Plan Active</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Total withdrawn: <span className="font-mono font-bold text-green-600 dark:text-green-500">
                            {formatCurrency(balanceUsed, currencyCode)}
                          </span> from credit cards
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold">Cash-Out Manager</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Withdraw cash from your credit cards when needed
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      onClick={() => setShowCashOutHistory(true)}
                      variant="outline"
                      className="flex-1 sm:flex-initial h-12"
                      data-testid="button-open-history"
                    >
                      History
                    </Button>
                    <Button
                      onClick={() => setShowCashOutPlanner(true)}
                      className="flex-1 sm:flex-initial h-12"
                      data-testid="button-open-planner"
                    >
                      <Calculator className="mr-2 h-4 w-4" />
                      Plan Cash-Out
                    </Button>
                  </div>
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
                  setEditingIncome(income as Income);
                  setShowAddIncome(true);
                }}
                onDelete={(id) => {
                  if (confirm('Are you sure you want to delete this income?')) {
                    deleteIncome.mutate(id);
                  }
                }}
                onReorder={(items) => reorderIncomes.mutate(items)}
                pendingStatusId={toggleIncomeStatus.isPending ? toggleIncomeStatus.variables?.id : null}
                deletingId={deleteIncome.isPending ? deleteIncome.variables : null}
                isAnyMutationPending={
                  toggleIncomeStatus.isPending ||
                  deleteIncome.isPending ||
                  updateIncome.isPending ||
                  reorderIncomes.isPending
                }
              />

              <ExpenseList
                expenses={expenses}
                currencyCode={currencyCode}
                onAdd={() => setShowAddExpense(true)}
                onToggleStatus={(id, status) => toggleExpenseStatus.mutate({ id, status })}
                onEdit={(expense) => {
                  setEditingExpense(expense as Expense);
                  setShowAddExpense(true);
                }}
                onDelete={(id) => {
                  if (confirm('Are you sure you want to delete this expense?')) {
                    deleteExpense.mutate(id);
                  }
                }}
                onReorder={(items) => reorderExpenses.mutate(items)}
                pendingStatusId={toggleExpenseStatus.isPending ? toggleExpenseStatus.variables?.id : null}
                deletingId={deleteExpense.isPending ? deleteExpense.variables : null}
                isAnyMutationPending={
                  toggleExpenseStatus.isPending ||
                  deleteExpense.isPending ||
                  updateExpense.isPending ||
                  reorderExpenses.isPending
                }
              />
            </div>

            {/* Cards & Loans */}
            <div className="grid lg:grid-cols-2 gap-6">
              <CardsList
                cards={cards}
                currencyCode={currencyCode}
                currentYear={year}
                currentMonth={month}
                onAdd={() => setShowAddCard(true)}
                onEdit={(card) => {
                  setEditingCard(card as Card);
                  setShowAddCard(true);
                }}
                onDelete={(id) => {
                  if (confirm('Are you sure you want to delete this credit card?')) {
                    deleteCreditCard.mutate(id);
                  }
                }}
                onReorder={(items) => reorderCards.mutate(items)}
              />

              <LoansList
                loans={loans}
                currencyCode={currencyCode}
                onAdd={() => setShowAddLoan(true)}
                onEdit={(loan) => {
                  setEditingLoan(loan as Loan);
                  setShowAddLoan(true);
                }}
                onDelete={(id) => {
                  if (confirm('Are you sure you want to delete this loan?')) {
                    deleteLoan.mutate(id);
                  }
                }}
                onReorder={(items) => reorderLoans.mutate(items)}
              />
            </div>

            {/* Create Next Month - only show if next month doesn't exist */}
            {!nextMonthBudgetData && (
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
            )}
          </div>
        )}
      </main>

      <Footer />

      {/* Dialogs */}
      <AddIncomeDialog
        open={showAddIncome}
        onOpenChange={(open) => {
          setShowAddIncome(open);
          if (!open) setEditingIncome(null);
        }}
        onAdd={(data) => addIncome.mutate(data)}
        onUpdate={(id, data) => updateIncome.mutate({ id, data })}
        initialData={editingIncome}
        isPending={addIncome.isPending || updateIncome.isPending}
      />

      <AddExpenseDialog
        open={showAddExpense}
        onOpenChange={(open) => {
          setShowAddExpense(open);
          if (!open) setEditingExpense(null);
        }}
        onAdd={(data) => addExpense.mutate(data)}
        onUpdate={(id, data) => updateExpense.mutate({ id, data })}
        initialData={editingExpense}
        isPending={addExpense.isPending || updateExpense.isPending}
        cards={cards}
        currentYear={year}
        currentMonth={month}
      />

      <AddCardDialog
        open={showAddCard}
        onOpenChange={(open) => {
          setShowAddCard(open);
          if (!open) setEditingCard(null);
        }}
        onAdd={(data) => addCard.mutate(data)}
        onUpdate={(id, data) => updateCreditCard.mutate({ id, data })}
        initialData={editingCard}
        isPending={addCard.isPending || updateCreditCard.isPending}
      />

      <AddLoanDialog
        open={showAddLoan}
        onOpenChange={(open) => {
          setShowAddLoan(open);
          if (!open) setEditingLoan(null);
        }}
        onAdd={(data) => addLoan.mutate(data)}
        onUpdate={(id, data) => updateLoan.mutate({ id, data })}
        initialData={editingLoan}
        isPending={addLoan.isPending || updateLoan.isPending}
      />

      <CashOutPlanner
        open={showCashOutPlanner}
        onOpenChange={setShowCashOutPlanner}
        cards={cardOptions}
        need={need}
        maxBalance={afterCardPayments}
        currencyCode={currencyCode}
        onApply={(withdrawals, balance) => applyCashOutPlan.mutate({ withdrawals, balance })}
        isPending={applyCashOutPlan.isPending}
      />

      <CashOutHistory
        open={showCashOutHistory}
        onOpenChange={setShowCashOutHistory}
        balanceUsed={balanceUsed}
        currencyCode={currencyCode}
        onReset={() => resetCashOutPlan.mutate()}
        isPending={resetCashOutPlan.isPending}
        cards={cards}
        beforeBalance={afterCardPayments}
        incomes={incomes}
      />
    </div>
  );
}
