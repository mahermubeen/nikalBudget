import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { parseAmount } from "@/lib/currency";
import type { Expense } from "@shared/schema";

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: { label: string; amount: string; recurring: boolean }) => void;
  onUpdate?: (id: string, data: { label: string; amount: string; recurring: boolean }) => void;
  initialData?: Expense | null;
  isPending?: boolean;
}

export function AddExpenseDialog({ open, onOpenChange, onAdd, onUpdate, initialData, isPending }: AddExpenseDialogProps) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [recurring, setRecurring] = useState(false);

  // Pre-fill form when editing
  useEffect(() => {
    if (open && initialData) {
      setLabel(initialData.label);
      setAmount(initialData.amount);
      setRecurring(initialData.recurring);
    } else if (open && !initialData) {
      // Reset form when adding new
      setLabel("");
      setAmount("");
      setRecurring(false);
    }
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !amount) return;

    if (initialData && onUpdate) {
      onUpdate(initialData.id, { label: label.trim(), amount, recurring });
    } else {
      onAdd({ label: label.trim(), amount, recurring });
    }
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
              disabled={isPending || !label.trim() || !amount}
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
