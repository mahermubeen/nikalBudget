import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/dateUtils";
import { StatusBadge } from "./StatusBadge";
import { RecurringBadge } from "./RecurringBadge";

interface Income {
  id: string;
  source: string;
  amount: string;
  recurring: boolean;
  status: string;
  paidDate: string | null;
}

interface IncomeListProps {
  incomes: Income[];
  currencyCode: string;
  onAdd: () => void;
  onToggleStatus: (id: string, currentStatus: string) => void;
  onEdit: (income: Income) => void;
  onDelete: (id: string) => void;
}

export function IncomeList({ incomes, currencyCode, onAdd, onToggleStatus, onEdit, onDelete }: IncomeListProps) {
  const total = incomes.reduce((sum, inc) => sum + parseFloat(inc.amount || '0'), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">Income</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Total: <span className="font-mono font-semibold" data-testid="text-income-total">
              {formatCurrency(total, currencyCode)}
            </span>
          </p>
        </div>
        <Button
          size="icon"
          onClick={onAdd}
          data-testid="button-add-income"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {incomes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No income items yet. Add your first one!
          </p>
        ) : (
          <div className="space-y-2">
            {incomes.map((income) => (
              <div
                key={income.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover-elevate"
                data-testid={`item-income-${income.id}`}
              >
                <Checkbox
                  checked={income.status === 'done'}
                  onCheckedChange={() => onToggleStatus(income.id, income.status)}
                  className="h-5 w-5"
                  data-testid={`checkbox-income-${income.id}`}
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium" data-testid={`text-income-source-${income.id}`}>
                      {income.source}
                    </span>
                    {income.recurring && <RecurringBadge />}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <StatusBadge status={income.status as 'pending' | 'done'} />
                    {income.paidDate && (
                      <span className="text-xs text-muted-foreground" data-testid={`text-income-paid-date-${income.id}`}>
                        Paid: {formatDate(income.paidDate)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="font-mono font-semibold text-success" data-testid={`text-income-amount-${income.id}`}>
                  {formatCurrency(income.amount, currencyCode)}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(income)}
                    data-testid={`button-edit-income-${income.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onDelete(income.id)}
                    data-testid={`button-delete-income-${income.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
