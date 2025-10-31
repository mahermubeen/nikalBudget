import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, CreditCard, DollarSign, Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/dateUtils";
import { StatusBadge } from "./StatusBadge";
import { RecurringBadge } from "./RecurringBadge";
import { Badge } from "@/components/ui/badge";

interface Expense {
  id: string;
  label: string;
  amount: string;
  recurring: boolean;
  status: string;
  paidDate: string | null;
  kind: string;
}

interface ExpenseListProps {
  expenses: Expense[];
  currencyCode: string;
  onAdd: () => void;
  onToggleStatus: (id: string, currentStatus: string) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

export function ExpenseList({ expenses, currencyCode, onAdd, onToggleStatus, onEdit, onDelete }: ExpenseListProps) {
  const total = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || '0'), 0);
  const nonCardTotal = expenses
    .filter(exp => exp.kind !== 'CARD_BILL')
    .reduce((sum, exp) => sum + parseFloat(exp.amount || '0'), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">Expenses</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Total: <span className="font-mono font-semibold" data-testid="text-expense-total">
              {formatCurrency(total, currencyCode)}
            </span>
            {' '} | Non-Card: <span className="font-mono font-semibold" data-testid="text-expense-non-card-total">
              {formatCurrency(nonCardTotal, currencyCode)}
            </span>
          </p>
        </div>
        <Button
          size="icon"
          onClick={onAdd}
          data-testid="button-add-expense"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No expenses yet. Add your first one!
          </p>
        ) : (
          <div className="space-y-2">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover-elevate"
                data-testid={`item-expense-${expense.id}`}
              >
                <Checkbox
                  checked={expense.status === 'done'}
                  onCheckedChange={() => onToggleStatus(expense.id, expense.status)}
                  className="h-5 w-5"
                  data-testid={`checkbox-expense-${expense.id}`}
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium" data-testid={`text-expense-label-${expense.id}`}>
                      {expense.label}
                    </span>
                    {expense.recurring && <RecurringBadge />}
                    {expense.kind === 'CARD_BILL' && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <CreditCard className="h-3 w-3" />
                        Card
                      </Badge>
                    )}
                    {expense.kind === 'LOAN' && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <DollarSign className="h-3 w-3" />
                        Loan
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <StatusBadge status={expense.status as 'pending' | 'done'} />
                    {expense.paidDate && (
                      <span className="text-xs text-muted-foreground" data-testid={`text-expense-paid-date-${expense.id}`}>
                        Paid: {formatDate(expense.paidDate)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="font-mono font-semibold text-destructive" data-testid={`text-expense-amount-${expense.id}`}>
                  {formatCurrency(expense.amount, currencyCode)}
                </div>

                {expense.kind === 'REGULAR' && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit(expense)}
                      data-testid={`button-edit-expense-${expense.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDelete(expense.id)}
                      data-testid={`button-delete-expense-${expense.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
