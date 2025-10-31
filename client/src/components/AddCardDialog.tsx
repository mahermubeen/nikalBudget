import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { calculateDayDifference, getDayOfMonth } from "@/lib/dateUtils";

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
  }) => void;
  isPending?: boolean;
}

export function AddCardDialog({ open, onOpenChange, onAdd, isPending }: AddCardDialogProps) {
  const [nickname, setNickname] = useState("");
  const [issuer, setIssuer] = useState("");
  const [last4, setLast4] = useState("");
  const [statementDate, setStatementDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !statementDate || !dueDate) return;
    
    const statementDay = getDayOfMonth(statementDate);
    const dueDay = getDayOfMonth(dueDate);
    const dayDifference = calculateDayDifference(statementDate, dueDate);
    
    onAdd({ 
      nickname: nickname.trim(), 
      issuer: issuer.trim() || undefined,
      last4: last4.trim() || undefined,
      statementDay,
      dueDay,
      dayDifference,
    });
    
    // Reset form
    setNickname("");
    setIssuer("");
    setLast4("");
    setStatementDate("");
    setDueDate("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Credit Card</DialogTitle>
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

            <p className="text-xs text-muted-foreground">
              * Future months will be auto-predicted based on these dates
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="h-12"
              data-testid="button-cancel-card"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !nickname.trim() || !statementDate || !dueDate}
              className="h-12"
              data-testid="button-submit-card"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Card
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
