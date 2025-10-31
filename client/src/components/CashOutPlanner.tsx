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
  currencyCode: string;
  onApply: (withdrawals: { cardId: string; amount: number }[]) => void;
  isPending?: boolean;
}

export function CashOutPlanner({ 
  open, 
  onOpenChange, 
  cards, 
  need, 
  currencyCode,
  onApply,
  isPending 
}: CashOutPlannerProps) {
  const [withdrawals, setWithdrawals] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize withdrawals with smart suggestion when dialog opens
  useEffect(() => {
    if (open && cards.length > 0) {
      const suggested = suggestWithdrawals();
      setWithdrawals(suggested);
      setErrors({});
    }
  }, [open, cards, need]);

  // Smart suggestion algorithm: prioritize card with later due date, then larger limit
  const suggestWithdrawals = (): Record<string, number> => {
    if (cards.length === 0 || need <= 0) return {};

    // Sort cards by due date (later first), then by available limit (larger first)
    const sortedCards = [...cards].sort((a, b) => {
      const dateCompare = b.dueDate.localeCompare(a.dueDate);
      if (dateCompare !== 0) return dateCompare;
      return b.availableLimit - a.availableLimit;
    });

    const result: Record<string, number> = {};
    let remaining = need;

    for (const card of sortedCards) {
      if (remaining <= 0) break;
      
      const amount = Math.min(remaining, card.availableLimit);
      if (amount > 0) {
        result[card.id] = amount;
        remaining -= amount;
      }
    }

    return result;
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
  const hasErrors = Object.keys(errors).length > 0;
  const isValid = totalWithdrawal > 0 && !hasErrors;

  const handleApply = () => {
    if (!isValid) return;

    const withdrawalList = Object.entries(withdrawals)
      .filter(([, amount]) => amount > 0)
      .map(([cardId, amount]) => ({ cardId, amount }));

    onApply(withdrawalList);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cash-Out Planner</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Need to Cover</div>
              <div className="text-2xl font-mono font-bold text-destructive mt-1" data-testid="text-planner-need">
                {formatCurrency(need, currencyCode)}
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total Withdrawal</div>
              <div className="text-2xl font-mono font-bold text-primary mt-1" data-testid="text-planner-total">
                {formatCurrency(totalWithdrawal, currencyCode)}
              </div>
            </Card>
          </div>

          {need <= 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You don't need cash-out this month. Your income covers all expenses!
              </AlertDescription>
            </Alert>
          ) : cards.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No credit cards available. Add cards first to use the cash-out planner.
              </AlertDescription>
            </Alert>
          ) : (
            <>
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

              {totalWithdrawal < need && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Current withdrawal ({formatCurrency(totalWithdrawal, currencyCode)}) is less than needed ({formatCurrency(need, currencyCode)}). 
                    {totalWithdrawal === 0 ? ' Adjust the sliders to plan your withdrawals.' : ' Consider increasing withdrawals or adjusting your budget.'}
                  </AlertDescription>
                </Alert>
              )}
            </>
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
            disabled={isPending || !isValid || need <= 0 || cards.length === 0}
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
