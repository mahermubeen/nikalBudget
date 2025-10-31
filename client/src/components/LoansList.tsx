import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/dateUtils";

interface LoanItem {
  id: string;
  name: string;
  installmentAmount: string;
  nextDueDate: string;
  recurring: boolean;
}

interface LoansListProps {
  loans: LoanItem[];
  currencyCode: string;
  onAdd: () => void;
}

export function LoansList({ loans, currencyCode, onAdd }: LoansListProps) {
  const total = loans.reduce((sum, loan) => sum + parseFloat(loan.installmentAmount || '0'), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">Loans</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Total: <span className="font-mono font-semibold" data-testid="text-loans-total">
              {formatCurrency(total, currencyCode)}
            </span>
          </p>
        </div>
        <Button
          size="icon"
          onClick={onAdd}
          data-testid="button-add-loan"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {loans.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No loans yet.
          </p>
        ) : (
          <div className="space-y-2">
            {loans.map((loan) => (
              <div
                key={loan.id}
                className="flex items-center gap-3 p-4 rounded-lg border hover-elevate"
                data-testid={`item-loan-${loan.id}`}
              >
                <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-semibold" data-testid={`text-loan-name-${loan.id}`}>
                    {loan.name}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Next due: {formatDate(loan.nextDueDate)}
                  </div>
                </div>
                
                <div className="font-mono font-semibold" data-testid={`text-loan-amount-${loan.id}`}>
                  {formatCurrency(loan.installmentAmount, currencyCode)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
