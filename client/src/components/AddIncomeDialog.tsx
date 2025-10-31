import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { parseAmount } from "@/lib/currency";
import type { Income } from "@shared/schema";

interface AddIncomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: { source: string; amount: string; recurring: boolean }) => void;
  onUpdate?: (id: string, data: { source: string; amount: string; recurring: boolean }) => void;
  initialData?: Income | null;
  isPending?: boolean;
}

export function AddIncomeDialog({ open, onOpenChange, onAdd, onUpdate, initialData, isPending }: AddIncomeDialogProps) {
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [recurring, setRecurring] = useState(false);

  // Pre-fill form when editing
  useEffect(() => {
    if (open && initialData) {
      setSource(initialData.source);
      setAmount(initialData.amount);
      setRecurring(initialData.recurring);
    } else if (open && !initialData) {
      // Reset form when adding new
      setSource("");
      setAmount("");
      setRecurring(false);
    }
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!source.trim() || !amount) return;

    if (initialData && onUpdate) {
      onUpdate(initialData.id, { source: source.trim(), amount, recurring });
    } else {
      onAdd({ source: source.trim(), amount, recurring });
    }
  };

  const isEditMode = !!initialData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Income' : 'Add Income'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g., Salary, Freelance"
                className="h-12"
                data-testid="input-income-source"
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
                data-testid="input-income-amount"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={recurring}
                onCheckedChange={(checked) => setRecurring(checked as boolean)}
                data-testid="checkbox-income-recurring"
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
              data-testid="button-cancel-income"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !source.trim() || !amount}
              className="h-12"
              data-testid="button-submit-income"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Update Income' : 'Add Income'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
