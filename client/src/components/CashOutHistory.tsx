import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle, Trash2, History } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CashOutHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balanceUsed: number;
  currencyCode: string;
  onReset: () => void;
  isPending?: boolean;
}

export function CashOutHistory({
  open,
  onOpenChange,
  balanceUsed,
  currencyCode,
  onReset,
  isPending
}: CashOutHistoryProps) {
  const hasActivePlan = balanceUsed > 0;

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
              <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Current Cash-Out Plan</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">Balance Used</div>
                      <div className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(balanceUsed, currencyCode)}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  This represents the amount from your account balance that you've allocated in the cash-out plan.
                  Resetting will clear this allocation and restore your full balance.
                </AlertDescription>
              </Alert>

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
                No active cash-out plan. Your full balance is available.
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
