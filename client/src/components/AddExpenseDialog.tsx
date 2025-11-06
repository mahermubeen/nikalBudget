import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { parseAmount } from "@/lib/currency";
import type { Expense, CreditCard } from "@shared/schema";

interface CardStatement {
  id: string;
  cardId: string;
  year: number;
  month: number;
  statementDate: string;
  dueDate: string;
  totalDue: string;
}

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: { label: string; amount: string; recurring: boolean; statementId?: string }) => void;
  onUpdate?: (id: string, data: { label: string; amount: string; recurring: boolean }) => void;
  initialData?: Expense | null;
  isPending?: boolean;
  cards?: CreditCard[];
  userId?: string;
  currentYear?: number;
  currentMonth?: number;
}

export function AddExpenseDialog({ open, onOpenChange, onAdd, onUpdate, initialData, isPending, cards = [], userId, currentYear, currentMonth }: AddExpenseDialogProps) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>(undefined);
  const [statements, setStatements] = useState<CardStatement[]>([]);
  const [selectedStatementId, setSelectedStatementId] = useState<string | undefined>(undefined);
  const [loadingStatements, setLoadingStatements] = useState(false);

  // Fetch statements when card is selected
  useEffect(() => {
    const fetchStatements = async () => {
      if (!selectedCardId || selectedCardId === "none") {
        setStatements([]);
        setSelectedStatementId(undefined);
        return;
      }

      // Use current date as fallback if year/month not provided
      const now = new Date();
      const year = currentYear || now.getFullYear();
      const month = currentMonth || (now.getMonth() + 1);

      console.log('Fetching statements for card:', selectedCardId, 'year:', year, 'month:', month);
      setLoadingStatements(true);

      try {
        const res = await fetch(`/api/cards/${selectedCardId}/statements?year=${year}&month=${month}`, {
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        console.log('Received statements:', data.statements);

        setStatements(data.statements || []);

        // Auto-select current month's statement if available
        if (data.statements && data.statements.length > 0) {
          const currentStatement = data.statements.find((s: CardStatement) =>
            s.year === year && s.month === month
          );
          if (currentStatement) {
            setSelectedStatementId(currentStatement.id);
            console.log('Auto-selected statement:', currentStatement.id);
          } else {
            // Select the first statement if current month not found
            setSelectedStatementId(data.statements[0].id);
            console.log('Selected first statement:', data.statements[0].id);
          }
        }
      } catch (err) {
        console.error("Error fetching statements:", err);
        setStatements([]);
      } finally {
        setLoadingStatements(false);
      }
    };

    fetchStatements();
  }, [selectedCardId, currentYear, currentMonth]);

  // Pre-fill form when editing
  useEffect(() => {
    if (open && initialData) {
      setLabel(initialData.label);
      setAmount(initialData.amount);
      setRecurring(initialData.recurring);
      setSelectedCardId(undefined); // Card expenses can't be edited to link to cards
      setSelectedStatementId(undefined);
    } else if (open && !initialData) {
      // Reset form when adding new
      setLabel("");
      setAmount("");
      setRecurring(false);
      setSelectedCardId(undefined);
      setSelectedStatementId(undefined);
    }
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !amount) return;

    // If card is selected, statement must be selected
    if (selectedCardId && selectedCardId !== "none" && !selectedStatementId) {
      console.error('[AddExpenseDialog] Card selected but no statement selected');
      return;
    }

    if (initialData && onUpdate) {
      onUpdate(initialData.id, { label: label.trim(), amount, recurring });
    } else {
      const expenseData = { label: label.trim(), amount, recurring, statementId: selectedStatementId };
      console.log('[AddExpenseDialog] Submitting expense:', expenseData);
      onAdd(expenseData);
    }
  };

  const formatStatementPeriod = (statement: CardStatement) => {
    const statementDate = new Date(statement.statementDate);
    const dueDate = new Date(statement.dueDate);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Format: "Sept 27 - Oct 5" (short format for current year) or "Sept 27 - Oct 5, 2024" for other years
    const currentYear = new Date().getFullYear();
    const showYear = statementDate.getFullYear() !== currentYear;

    return `${monthNames[statementDate.getMonth()]} ${statementDate.getDate()} - ${monthNames[dueDate.getMonth()]} ${dueDate.getDate()}${showYear ? `, ${statementDate.getFullYear()}` : ''}`;
  };

  const isEditMode = !!initialData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Groceries, Rent"
                className="h-12"
                data-testid="input-expense-label"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(parseAmount(e.target.value))}
                placeholder="0.00"
                className="h-12 font-mono"
                data-testid="input-expense-amount"
                required
              />
            </div>

            {!isEditMode && cards && cards.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="card">Credit Card (Optional)</Label>
                <Select value={selectedCardId || "none"} onValueChange={(value) => setSelectedCardId(value === "none" ? undefined : value)}>
                  <SelectTrigger className="h-12" data-testid="select-expense-card">
                    <SelectValue placeholder="Select card if this is a card bill" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Regular Expense)</SelectItem>
                    {cards.map((card) => (
                      <SelectItem key={card.id} value={card.id}>
                        {card.nickname} {card.last4 ? `(••${card.last4})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select a card if this expense is a credit card bill payment
                </p>
              </div>
            )}

            {!isEditMode && selectedCardId && selectedCardId !== "none" && (
              <div className="space-y-2">
                <Label htmlFor="statement">Statement Period <span className="text-destructive">*</span></Label>
                {loadingStatements ? (
                  <div className="flex items-center justify-center h-12 border rounded-md">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : statements.length > 0 ? (
                  <>
                    <Select value={selectedStatementId || ""} onValueChange={setSelectedStatementId}>
                      <SelectTrigger className="h-12" data-testid="select-expense-statement">
                        <SelectValue placeholder="Select statement period" />
                      </SelectTrigger>
                      <SelectContent>
                        {statements.map((statement) => (
                          <SelectItem key={statement.id} value={statement.id}>
                            {formatStatementPeriod(statement)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select which statement period this expense belongs to
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground p-3 border rounded-md">
                    No statements found for this card. Please create a statement first or select a different month.
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={recurring}
                onCheckedChange={(checked) => setRecurring(checked as boolean)}
                data-testid="checkbox-expense-recurring"
              />
              <Label htmlFor="recurring" className="font-normal cursor-pointer">
                Recurring (copies to next month)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="h-12"
              data-testid="button-cancel-expense"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !label.trim() || !amount || (!!selectedCardId && selectedCardId !== "none" && !selectedStatementId)}
              className="h-12"
              data-testid="button-submit-expense"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Update Expense' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
