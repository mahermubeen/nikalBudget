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
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sort cards by available limit (descending - larger limit first)
  // If limits are similar (within 10% difference), prioritize cards with later due dates
  const sortedCards = [...cards].sort((a, b) => {
    const limitDiff = b.availableLimit - a.availableLimit;
    const limitThreshold = Math.max(a.availableLimit, b.availableLimit) * 0.1;

    // If limits are significantly different, sort by limit
    if (Math.abs(limitDiff) > limitThreshold) {
      return limitDiff;
    }

    // If limits are similar, sort by due date (later dates first)
    return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
  });

  // Initialize withdrawals with smart suggestion when dialog opens
  useEffect(() => {
    if (open) {
      const suggestedWithdrawals = suggestPlan();
      setWithdrawals(suggestedWithdrawals);
      setErrors({});
    }
  }, [open, cards, need]);

  // Smart suggestion algorithm: use cards sorted by available limit (larger first)
  const suggestPlan = (): Record<string, number> => {
    if (need <= 0) return {};

    const withdrawals: Record<string, number> = {};
    let remaining = need;

    // Use cards with larger limits first
    for (const card of sortedCards) {
      if (remaining <= 0) break;

      const amount = Math.min(remaining, card.availableLimit);
      if (amount > 0) {
        withdrawals[card.id] = amount;
        remaining -= amount;
      }
    }

    return withdrawals;
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

  const handleInputChange = (cardId: string, inputValue: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    // Parse the input value and convert to number
    const parsedString = parseAmount(inputValue);
    const parsedValue = parseFloat(parsedString);

    // If empty or invalid, set to 0
    if (isNaN(parsedValue) || parsedValue < 0) {
      handleWithdrawalChange(cardId, 0);
      return;
    }

    // Update with parsed value (validation will happen in handleWithdrawalChange)
    handleWithdrawalChange(cardId, parsedValue);
  };

  const totalWithdrawal = Object.values(withdrawals).reduce((sum, val) => sum + val, 0);
  const totalCoverage = totalWithdrawal;
  const hasErrors = Object.keys(errors).length > 0;
  const isValid = !hasErrors;

  const handleApply = () => {
    if (!isValid) return;

    const withdrawalList = Object.entries(withdrawals)
      .filter(([, amount]) => amount > 0)
      .map(([cardId, amount]) => ({ cardId, amount }));

    onApply(withdrawalList, 0); // No balance used, only card withdrawals
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
              <div className="text-sm text-muted-foreground">Total Coverage</div>
              <div className={`text-2xl font-mono font-bold mt-1 ${totalCoverage >= need ? 'text-green-600' : 'text-yellow-600'}`} data-testid="text-planner-coverage">
                {formatCurrency(totalCoverage, currencyCode)}
              </div>
            </Card>
          </div>

          {cards.length === 0 && need > 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No credit cards available for withdrawals.
              </AlertDescription>
            </Alert>
          ) : null}

          {/* Card Withdrawal Sliders */}
          {sortedCards.length > 0 && (
            <div className="space-y-4">
                {sortedCards.map((card) => {
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

                        {/* Input field for manual entry */}
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`input-${card.id}`} className="text-xs whitespace-nowrap">
                            Amount:
                          </Label>
                          <Input
                            id={`input-${card.id}`}
                            type="text"
                            inputMode="numeric"
                            value={withdrawal.toString()}
                            onChange={(e) => handleInputChange(card.id, e.target.value)}
                            className="h-10 font-mono text-right"
                            data-testid={`input-card-${card.id}`}
                          />
                        </div>

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
                {totalCoverage === 0 ? ' Adjust the sliders to plan your withdrawals.' : ` You still need ${formatCurrency(need - totalCoverage, currencyCode)} more.`}
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
