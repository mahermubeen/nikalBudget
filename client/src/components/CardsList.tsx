import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CreditCard, Pencil, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import type { CreditCard as CreditCardType } from "@shared/schema";

interface CreditCardItem {
  id: string;
  nickname: string;
  issuer: string | null;
  last4: string | null;
  statementDay: number;
  dueDay: number;
}

interface CardsListProps {
  cards: CreditCardItem[];
  onAdd: () => void;
  onEdit: (card: CreditCardItem) => void;
  onDelete: (id: string) => void;
}

export function CardsList({ cards, onAdd, onEdit, onDelete }: CardsListProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">Credit Cards</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {cards.length} card{cards.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <Button
          size="icon"
          onClick={onAdd}
          data-testid="button-add-card"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {cards.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No credit cards yet. Add one to start tracking cycles!
          </p>
        ) : (
          <div className="space-y-2">
            {cards.map((card) => (
              <div
                key={card.id}
                className="flex items-center gap-3 p-4 rounded-lg border hover-elevate"
                data-testid={`item-card-${card.id}`}
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-semibold" data-testid={`text-card-nickname-${card.id}`}>
                    {card.nickname}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {card.issuer && <span>{card.issuer} </span>}
                    {card.last4 && <span className="font-mono">••{card.last4}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Statement: Day {card.statementDay} • Due: Day {card.dueDay}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(card)}
                    data-testid={`button-edit-card-${card.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onDelete(card.id)}
                    data-testid={`button-delete-card-${card.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
