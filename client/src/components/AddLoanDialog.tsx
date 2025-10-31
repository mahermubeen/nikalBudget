import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { parseAmount } from "@/lib/currency";
import type { Loan } from "@shared/schema";

interface AddLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: {
    name: string;
    installmentAmount: string;
    nextDueDate: string;
  }) => void;
  onUpdate?: (id: string, data: {
    name: string;
    installmentAmount: string;
    nextDueDate: string;
  }) => void;
  initialData?: Loan | null;
  isPending?: boolean;
}

export function AddLoanDialog({ open, onOpenChange, onAdd, onUpdate, initialData, isPending }: AddLoanDialogProps) {
  const [name, setName] = useState("");
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");

  // Pre-fill form when editing
  useEffect(() => {
    if (open && initialData) {
      setName(initialData.name);
      setInstallmentAmount(initialData.installmentAmount);
      setNextDueDate(initialData.nextDueDate);
    } else if (open && !initialData) {
      // Reset form when adding new
      setName("");
      setInstallmentAmount("");
      setNextDueDate("");
    }
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !installmentAmount || !nextDueDate) return;

    const data = {
      name: name.trim(),
      installmentAmount,
      nextDueDate,
    };

    if (initialData && onUpdate) {
      onUpdate(initialData.id, data);
    } else {
      onAdd(data);
    }
  };

  const isEditMode = !!initialData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Loan' : 'Add Loan'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Loan Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Faysal Installment, Car Loan"
                className="h-12"
                data-testid="input-loan-name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="installmentAmount">Installment Amount</Label>
              <Input
                id="installmentAmount"
                type="text"
                inputMode="decimal"
                value={installmentAmount}
                onChange={(e) => setInstallmentAmount(parseAmount(e.target.value))}
                placeholder="0.00"
                className="h-12 font-mono"
                data-testid="input-loan-amount"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nextDueDate">Next Due Date</Label>
              <Input
                id="nextDueDate"
                type="date"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                className="h-12"
                data-testid="input-loan-due-date"
                required
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Loans are automatically recurring and will appear in monthly expenses
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="h-12"
              data-testid="button-cancel-loan"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !name.trim() || !installmentAmount || !nextDueDate}
              className="h-12"
              data-testid="button-submit-loan"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Update Loan' : 'Add Loan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
