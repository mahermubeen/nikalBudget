import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { formatCurrency, parseAmount } from "@/lib/currency";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CardOption {
  id: string;
  nickname: string;
  availableLimit: number;
  dueDate: string;
}

interface CashOutPlannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: CardOption[];
  need: number;
  maxBalance: number; // afterCardPayments value
  currencyCode: string;
  onApply: (withdrawals: { cardId: string; amount: number }[], balance: number) => void;
  isPending?: boolean;
}

export function CashOutPlanner({
  open,
  onOpenChange,
  cards,
  need,
  maxBalance,
  currencyCode,
  onApply,
  isPending
}: CashOutPlannerProps) {
  const [withdrawals, setWithdrawals] = useState<Record<string, number>>({});
  const [balance, setBalance] = useState<number>(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize withdrawals with smart suggestion when dialog opens
  useEffect(() => {
    if (open) {
      const { suggestedBalance, suggestedWithdrawals } = suggestPlan();
      setBalance(suggestedBalance);
      setWithdrawals(suggestedWithdrawals);
      setErrors({});
    }
  }, [open, cards, need, maxBalance]);

  // Smart suggestion algorithm: prioritize balance first, then cards
  const suggestPlan = (): { suggestedBalance: number; suggestedWithdrawals: Record<string, number> } => {
    if (need <= 0) return { suggestedBalance: 0, suggestedWithdrawals: {} };

    // Step 1: Use balance first (up to maxBalance)
    const balanceToUse = Math.min(need, maxBalance);
    let remaining = need - balanceToUse;

    // Step 2: If still need more, use cards
    const withdrawals: Record<string, number> = {};

    if (remaining > 0 && cards.length > 0) {
      // Sort cards by due date (later first), then by available limit (larger first)
      const sortedCards = [...cards].sort((a, b) => {
        const dateCompare = b.dueDate.localeCompare(a.dueDate);
        if (dateCompare !== 0) return dateCompare;
        return b.availableLimit - a.availableLimit;
      });

      for (const card of sortedCards) {
        if (remaining <= 0) break;

        const amount = Math.min(remaining, card.availableLimit);
        if (amount > 0) {
          withdrawals[card.id] = amount;
          remaining -= amount;
        }
      }
    }

    return {
      suggestedBalance: balanceToUse,
      suggestedWithdrawals: withdrawals,
    };
  };

  const handleWithdrawalChange = (cardId: string, value: number) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    // Validate against available limit
    if (value > card.availableLimit) {
      setErrors(prev => ({
        ...prev,
        [cardId]: `Exceeds available limit of ${formatCurrency(card.availableLimit, currencyCode)}`
      }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[cardId];
        return newErrors;
      });
    }

    setWithdrawals(prev => ({
      ...prev,
      [cardId]: value
    }));
  };

  const totalWithdrawal = Object.values(withdrawals).reduce((sum, val) => sum + val, 0);
  const totalCoverage = totalWithdrawal + balance;
  const hasErrors = Object.keys(errors).length > 0;
  const isValid = !hasErrors; // Allow applying even with 0 (to reset balance)

  const handleApply = () => {
    if (!isValid) return;

    const withdrawalList = Object.entries(withdrawals)
      .filter(([, amount]) => amount > 0)
      .map(([cardId, amount]) => ({ cardId, amount }));

    onApply(withdrawalList, balance);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cash-Out Planner</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Need to Cover</div>
              <div className="text-2xl font-mono font-bold text-destructive mt-1" data-testid="text-planner-need">
                {formatCurrency(need, currencyCode)}
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Card Withdrawals</div>
              <div className="text-2xl font-mono font-bold text-primary mt-1" data-testid="text-planner-total">
                {formatCurrency(totalWithdrawal, currencyCode)}
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total Coverage</div>
              <div className={`text-2xl font-mono font-bold mt-1 ${totalCoverage >= need ? 'text-green-600' : 'text-yellow-600'}`} data-testid="text-planner-coverage">
                {formatCurrency(totalCoverage, currencyCode)}
              </div>
            </Card>
          </div>

          {/* Balance Slider */}
          <div className="p-4 border rounded-lg space-y-3 bg-green-50 dark:bg-green-950/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-semibold">Account Balance</div>
                <div className="text-sm text-muted-foreground">
                  Available: {formatCurrency(maxBalance, currencyCode)}
                </div>
              </div>
              <div className="font-mono font-bold text-green-600 text-xl">
                {formatCurrency(balance, currencyCode)}
              </div>
            </div>
            <div className="space-y-2">
              <Slider
                value={[balance]}
                onValueChange={([value]) => setBalance(value)}
                max={maxBalance}
                step={100}
                className="w-full"
                data-testid="slider-balance"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>₹0</span>
                <span>{formatCurrency(maxBalance, currencyCode)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Use your available balance (Income - Cards) to cover expenses.
            </p>
          </div>

          {cards.length === 0 && need > 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No credit cards available for withdrawals. You can still use your account balance.
              </AlertDescription>
            </Alert>
          ) : null}

          {/* Card Withdrawal Sliders */}
          {cards.length > 0 && (
            <div className="space-y-4">
                {cards.map((card) => {
                  const withdrawal = withdrawals[card.id] || 0;
                  const error = errors[card.id];

                  return (
                    <div key={card.id} className="space-y-3 p-4 border rounded-lg" data-testid={`planner-card-${card.id}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{card.nickname}</div>
                          <div className="text-sm text-muted-foreground">
                            Limit: {formatCurrency(card.availableLimit, currencyCode)}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-primary">
                          {formatCurrency(withdrawal, currencyCode)}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Slider
                          value={[withdrawal]}
                          onValueChange={([value]) => handleWithdrawalChange(card.id, value)}
                          max={card.availableLimit}
                          step={100}
                          className="w-full"
                          data-testid={`slider-card-${card.id}`}
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>0</span>
                          <span>{formatCurrency(card.availableLimit, currencyCode)}</span>
                        </div>
                      </div>

                      {error && (
                        <p className="text-sm text-destructive">{error}</p>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* Coverage Alert */}
          {need > 0 && totalCoverage < need && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Current coverage ({formatCurrency(totalCoverage, currencyCode)}) is less than needed ({formatCurrency(need, currencyCode)}).
                {totalCoverage === 0 ? ' Add balance or adjust the sliders to plan your withdrawals.' : ` You still need ${formatCurrency(need - totalCoverage, currencyCode)} more.`}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="h-12"
            data-testid="button-cancel-planner"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={isPending || !isValid}
            className="h-12"
            data-testid="button-apply-planner"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
