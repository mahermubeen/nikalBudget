import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { calculateDayDifference, getDayOfMonth } from "@/lib/dateUtils";
import type { CreditCard } from "@shared/schema";

interface AddCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: {
    nickname: string;
    issuer?: string;
    last4?: string;
    statementDay: number;
    dueDay: number;
    dayDifference: number;
    firstStatementDate: string;
    billingCycleDays: number;
    totalLimit?: string;
  }) => void;
  onUpdate?: (id: string, data: {
    nickname: string;
    issuer?: string;
    last4?: string;
    statementDay: number;
    dueDay: number;
    dayDifference: number;
    firstStatementDate: string;
    billingCycleDays: number;
    totalLimit?: string;
  }) => void;
  initialData?: CreditCard | null;
  isPending?: boolean;
}

export function AddCardDialog({ open, onOpenChange, onAdd, onUpdate, initialData, isPending }: AddCardDialogProps) {
  const [nickname, setNickname] = useState("");
  const [issuer, setIssuer] = useState("");
  const [last4, setLast4] = useState("");
  const [statementDate, setStatementDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [billingCycleDays, setBillingCycleDays] = useState("30");
  const [totalLimit, setTotalLimit] = useState("");

  // Pre-fill form when editing, reset when adding new
  useEffect(() => {
    if (open && initialData) {
      setNickname(initialData.nickname);
      setIssuer(initialData.issuer || "");
      setLast4(initialData.last4 || "");
      setTotalLimit(initialData.totalLimit || "");
      setBillingCycleDays(String(initialData.billingCycleDays || 30));
      // Use firstStatementDate if available, otherwise fallback to statementDay
      if (initialData.firstStatementDate) {
        setStatementDate(initialData.firstStatementDate);
      } else {
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        setStatementDate(`${year}-${String(month).padStart(2, '0')}-${String(initialData.statementDay).padStart(2, '0')}`);
      }
      // Calculate due date
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;
      setDueDate(`${year}-${String(month).padStart(2, '0')}-${String(initialData.dueDay).padStart(2, '0')}`);
    } else if (open && !initialData) {
      // Reset form when adding new
      setNickname("");
      setIssuer("");
      setLast4("");
      setStatementDate("");
      setDueDate("");
      setBillingCycleDays("30");
      setTotalLimit("");
    }
  }, [open, initialData]);

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !statementDate || !dueDate) {
      console.log("Form validation failed:", { nickname: nickname.trim(), statementDate, dueDate });
      return;
    }

    const statementDay = getDayOfMonth(statementDate);
    const dueDay = getDayOfMonth(dueDate);
    const dayDifference = calculateDayDifference(statementDate, dueDate);

    console.log("Submitting card:", { nickname, statementDay, dueDay, dayDifference });

    const data = {
      nickname: nickname.trim(),
      issuer: issuer.trim() || undefined,
      last4: last4.trim() || undefined,
      statementDay,
      dueDay,
      dayDifference,
      firstStatementDate: statementDate,
      billingCycleDays: parseInt(billingCycleDays) || 30,
      totalLimit: totalLimit.trim() || undefined,
    };

    if (initialData && onUpdate) {
      onUpdate(initialData.id, data);
    } else {
      onAdd(data);
    }
  };

  const isEditMode = !!initialData;

  // Check if form is valid
  const isFormValid = nickname.trim().length > 0 && statementDate.length > 0 && dueDate.length > 0;

  // Debug logging
  useEffect(() => {
    if (open) {
      console.log("AddCardDialog state:", {
        nickname: nickname.trim(),
        statementDate,
        dueDate,
        isPending,
        isFormValid,
        buttonShouldBeEnabled: !isPending && isFormValid
      });
    }
  }, [open, nickname, statementDate, dueDate, isPending, isFormValid]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Credit Card' : 'Add Credit Card'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname *</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g., JS Bank, Alfalah Bank"
                className="h-12"
                data-testid="input-card-nickname"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issuer">Issuer</Label>
                <Input
                  id="issuer"
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  placeholder="Optional"
                  className="h-12"
                  data-testid="input-card-issuer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last4">Last 4 Digits</Label>
                <Input
                  id="last4"
                  value={last4}
                  onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="1234"
                  maxLength={4}
                  className="h-12 font-mono"
                  data-testid="input-card-last4"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="statementDate">First Known Statement Date *</Label>
              <Input
                id="statementDate"
                type="date"
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
                className="h-12"
                data-testid="input-card-statement-date"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">First Known Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-12"
                data-testid="input-card-due-date"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingCycleDays">Billing Cycle (Days) *</Label>
              <Input
                id="billingCycleDays"
                type="number"
                value={billingCycleDays}
                onChange={(e) => setBillingCycleDays(e.target.value)}
                placeholder="30"
                className="h-12"
                data-testid="input-card-billing-cycle"
                min="28"
                max="31"
                required
              />
              <p className="text-xs text-muted-foreground">
                Days between consecutive statements (typically 28-30)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalLimit">Total Credit Limit (Optional)</Label>
              <Input
                id="totalLimit"
                type="number"
                value={totalLimit}
                onChange={(e) => setTotalLimit(e.target.value)}
                placeholder="250000"
                className="h-12 font-mono"
                data-testid="input-card-total-limit"
                min="0"
                step="0.01"
              />
              <p className="text-xs text-muted-foreground">
                Enter your card's total credit limit. Available limit = Total Limit - Total Due
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              * Future months will be auto-predicted based on these dates
            </p>

            {/* Validation feedback */}
            {!isFormValid && (nickname.length > 0 || statementDate.length > 0 || dueDate.length > 0) && (
              <p className="text-xs text-red-500">
                Please fill in all required fields (marked with *)
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
              className="h-12"
              data-testid="button-cancel-card"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !isFormValid}
              className="h-12"
              data-testid="button-submit-card"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? (isEditMode ? "Updating..." : "Adding...") : (isEditMode ? "Update Card" : "Add Card")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
