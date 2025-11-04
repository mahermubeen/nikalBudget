import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle, Trash2, History } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { CreditCard, Income } from "@shared/schema";

interface CashOutHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balanceUsed: number; // Total cash-out amount
  currencyCode: string;
  onReset: () => void;
  isPending?: boolean;
  cards: CreditCard[];
  beforeBalance: number;
  incomes: Income[]; // To get cash-out details
}

export function CashOutHistory({
  open,
  onOpenChange,
  balanceUsed,
  currencyCode,
  onReset,
  isPending,
  cards,
  beforeBalance,
  incomes
}: CashOutHistoryProps) {
  const hasActivePlan = balanceUsed > 0;
  const totalCashOut = balanceUsed;

  // Get cash-out income items
  const cashOutIncomes = incomes.filter(inc => inc.source.startsWith('Cash-out –'));

  // Calculate the actual before balance (beforeBalance already includes cash-out, so subtract it)
  const actualBeforeBalance = beforeBalance - totalCashOut;
  const currentBalance = beforeBalance; // This is afterCardPayments which now includes cash-out

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Cash-Out History
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {hasActivePlan ? (
            <>
              {/* Summary */}
              <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <div className="space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">Balance Update</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Before Cash-Out:</span>
                      <span className="font-mono font-semibold">{formatCurrency(actualBeforeBalance, currencyCode)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Cash-Out Amount:</span>
                      <span className="font-mono font-semibold text-green-600">+{formatCurrency(totalCashOut, currencyCode)}</span>
                    </div>
                    <div className="border-t pt-2 flex items-center justify-between">
                      <span className="font-medium">Current Balance:</span>
                      <span className="text-2xl font-mono font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(currentBalance, currencyCode)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Withdrawal Details */}
              {cashOutIncomes.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Withdrawal Details</div>
                  {cashOutIncomes.map((income) => {
                    // Extract card nickname from "Cash-out – CardNickname"
                    const cardNickname = income.source.replace('Cash-out – ', '');
                    const card = cards.find(c => c.nickname === cardNickname);

                    const withdrawalAmount = parseFloat(income.amount);
                    const originalLimit = card ? parseFloat(card.totalLimit || '0') : 0;
                    const currentAvailable = card ? parseFloat(card.availableLimit || '0') : 0;

                    return (
                      <Card key={income.id} className="p-3 bg-blue-50 dark:bg-blue-950/20">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold">{cardNickname}</div>
                            <div className="font-mono font-bold text-blue-600">
                              {formatCurrency(withdrawalAmount, currencyCode)}
                            </div>
                          </div>
                          {card && (
                            <div className="text-xs text-muted-foreground">
                              Available Limit: {formatCurrency(currentAvailable, currencyCode)} / {formatCurrency(originalLimit, currencyCode)}
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              <Button
                onClick={onReset}
                disabled={isPending}
                variant="destructive"
                className="w-full h-12"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Trash2 className="mr-2 h-4 w-4" />
                Reset Cash-Out Plan
              </Button>
            </>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No active cash-out plan.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-12 w-full"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
