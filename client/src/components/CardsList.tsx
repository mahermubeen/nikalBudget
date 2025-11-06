import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CreditCard, Pencil, Trash2, GripVertical } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { formatCurrency } from "@/lib/currency";
import type { CreditCard as CreditCardType } from "@shared/schema";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CreditCardItem {
  id: string;
  nickname: string;
  issuer: string | null;
  last4: string | null;
  statementDay: number;
  dueDay: number;
  dayDifference: number;
  firstStatementDate: string | null;
  billingCycleDays: number | null;
  totalLimit: string | null;
  availableLimit: string | null;
  displayOrder: number;
  userId: string;
  createdAt: Date | null;
}

interface CardsListProps {
  cards: CreditCardItem[];
  onAdd: () => void;
  onEdit: (card: CreditCardItem) => void;
  onDelete: (id: string) => void;
  onReorder: (items: CreditCardItem[]) => void;
  currencyCode?: string;
  currentYear?: number;
  currentMonth?: number;
}

interface SortableCardItemProps {
  card: CreditCardItem;
  currencyCode: string;
  currentYear?: number;
  currentMonth?: number;
  calculateDates: (card: CreditCardItem) => string | null;
  onEdit: (card: CreditCardItem) => void;
  onDelete: (id: string) => void;
}

function SortableCardItem({ card, currencyCode, currentYear, currentMonth, calculateDates, onEdit, onDelete }: SortableCardItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-3 rounded-lg border hover-elevate"
      data-testid={`item-card-${card.id}`}
    >
      {/* Mobile Layout */}
      <div className="flex items-start gap-2 sm:hidden">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none mt-1"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
          <CreditCard className="h-4 w-4 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm mb-1" data-testid={`text-card-nickname-${card.id}`}>
            {card.nickname}
          </div>
          <div className="text-xs text-muted-foreground mb-1">
            {card.issuer && <span>{card.issuer} </span>}
            {card.last4 && <span className="font-mono">••{card.last4}</span>}
          </div>
          <div className="text-xs text-muted-foreground mb-1">
            {currentYear && currentMonth && calculateDates(card) ? (
              <span>{calculateDates(card)}</span>
            ) : (
              <span>Statement: Day {card.statementDay} • Due: Day {card.dueDay}</span>
            )}
          </div>
          {card.totalLimit && (
            <div className="text-xs text-muted-foreground mb-2">
              <div>Limit: {formatCurrency(parseFloat(card.totalLimit), currencyCode)}</div>
              {card.availableLimit && (
                <div>Available: {formatCurrency(parseFloat(card.availableLimit), currencyCode)}</div>
              )}
            </div>
          )}

          <div className="flex items-center gap-1 justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => onEdit(card)}
              data-testid={`button-edit-card-${card.id}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-destructive hover:text-destructive"
              onClick={() => onDelete(card.id)}
              data-testid={`button-delete-card-${card.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:flex items-center gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>

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
            {currentYear && currentMonth && calculateDates(card) ? (
              <span>{calculateDates(card)}</span>
            ) : (
              <span>Statement: Day {card.statementDay} • Due: Day {card.dueDay}</span>
            )}
          </div>
          {card.totalLimit && (
            <div className="text-xs text-muted-foreground mt-1">
              <span>Limit: {formatCurrency(parseFloat(card.totalLimit), currencyCode)}</span>
              {card.availableLimit && (
                <span> | Available: {formatCurrency(parseFloat(card.availableLimit), currencyCode)}</span>
              )}
            </div>
          )}
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
    </div>
  );
}

export function CardsList({ cards, onAdd, onEdit, onDelete, onReorder, currencyCode = 'PKR', currentYear, currentMonth }: CardsListProps) {
  // Calculate statement and due dates for a card based on billing cycle
  const calculateDates = (card: CreditCardItem) => {
    if (!currentYear || !currentMonth) return null;
    if (!card.firstStatementDate || !card.billingCycleDays) {
      // Fallback to old method if new fields not available
      return null;
    }

    // Parse the first statement date
    const firstStmtDate = new Date(card.firstStatementDate + 'T00:00:00');

    // Define the target month's start and end
    const targetMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const targetMonthEnd = new Date(currentYear, currentMonth, 0); // Last day of target month

    let statementDate = new Date(firstStmtDate);
    let dueDate = new Date(firstStmtDate);
    dueDate.setDate(dueDate.getDate() + card.dayDifference);

    // Keep adding cycles until we find a statement whose DUE DATE falls in the target month
    let maxIterations = 1000; // Safety limit
    let iteration = 0;

    while (iteration < maxIterations) {
      // Check if the due date falls within the target month
      if (dueDate >= targetMonthStart && dueDate <= targetMonthEnd) {
        // Found the statement with due date in target month
        break;
      }

      // If we've gone past the target month, we went too far
      if (dueDate > targetMonthEnd) {
        // Go back one cycle
        statementDate.setDate(statementDate.getDate() - card.billingCycleDays);
        dueDate.setDate(dueDate.getDate() - card.billingCycleDays);
        break;
      }

      // Move to next billing cycle
      statementDate.setDate(statementDate.getDate() + card.billingCycleDays);
      dueDate.setDate(dueDate.getDate() + card.billingCycleDays);
      iteration++;
    }

    // Format dates with month names
    const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const statementFormatted = statementDate.toLocaleDateString('en-US', formatOptions);
    const dueFormatted = dueDate.toLocaleDateString('en-US', formatOptions);

    return `Statement: ${statementFormatted} - Due: ${dueFormatted}`;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = cards.findIndex((item) => item.id === active.id);
      const newIndex = cards.findIndex((item) => item.id === over.id);

      const reorderedItems = arrayMove(cards, oldIndex, newIndex);
      onReorder(reorderedItems);
    }
  };

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={cards.map(card => card.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {cards.map((card) => (
                  <SortableCardItem
                    key={card.id}
                    card={card}
                    currencyCode={currencyCode}
                    currentYear={currentYear}
                    currentMonth={currentMonth}
                    calculateDates={calculateDates}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}
