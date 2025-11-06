import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, CreditCard, DollarSign, Pencil, Trash2, Loader2, GripVertical } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/dateUtils";
import { StatusBadge } from "./StatusBadge";
import { RecurringBadge } from "./RecurringBadge";
import { Badge } from "@/components/ui/badge";
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

interface Expense {
  id: string;
  label: string;
  amount: string;
  recurring: boolean;
  status: string;
  paidDate: string | null;
  kind: string;
  displayOrder: number;
  budgetId: string;
  createdAt: Date | null;
  linkedCardStatementId: string | null;
  linkedLoanId: string | null;
}

interface ExpenseListProps {
  expenses: Expense[];
  currencyCode: string;
  onAdd: () => void;
  onToggleStatus: (id: string, currentStatus: string) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onReorder: (items: Expense[]) => void;
  pendingStatusId?: string | null;
  deletingId?: string | null;
  isAnyMutationPending?: boolean;
}

interface SortableExpenseItemProps {
  expense: Expense;
  currencyCode: string;
  pendingStatusId?: string | null;
  deletingId?: string | null;
  onToggleStatus: (id: string, currentStatus: string) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

function SortableExpenseItem({ expense, currencyCode, pendingStatusId, deletingId, onToggleStatus, onEdit, onDelete }: SortableExpenseItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: expense.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-lg border hover-elevate"
      data-testid={`item-expense-${expense.id}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="relative flex items-center justify-center h-5 w-5">
        {pendingStatusId === expense.id ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <Checkbox
            checked={expense.status === 'done'}
            onCheckedChange={() => onToggleStatus(expense.id, expense.status)}
            className="h-5 w-5"
            data-testid={`checkbox-expense-${expense.id}`}
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium" data-testid={`text-expense-label-${expense.id}`}>
            {expense.label}
          </span>
          {expense.recurring && <RecurringBadge />}
          {expense.kind === 'CARD_BILL' && (
            <Badge variant="outline" className="text-xs gap-1">
              <CreditCard className="h-3 w-3" />
              Card
            </Badge>
          )}
          {expense.kind === 'LOAN' && (
            <Badge variant="outline" className="text-xs gap-1">
              <DollarSign className="h-3 w-3" />
              Loan
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <StatusBadge status={expense.status as 'pending' | 'done'} />
          {expense.paidDate && (
            <span className="text-xs text-muted-foreground" data-testid={`text-expense-paid-date-${expense.id}`}>
              Paid: {formatDate(expense.paidDate)}
            </span>
          )}
        </div>
      </div>

      <div className="font-mono font-semibold text-destructive" data-testid={`text-expense-amount-${expense.id}`}>
        {formatCurrency(expense.amount, currencyCode)}
      </div>

      <div className="flex items-center gap-1">
        {expense.kind === 'REGULAR' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(expense)}
            data-testid={`button-edit-expense-${expense.id}`}
            disabled={deletingId === expense.id}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        {(expense.kind === 'REGULAR' || expense.kind === 'CARD_BILL') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(expense.id)}
            data-testid={`button-delete-expense-${expense.id}`}
            disabled={deletingId === expense.id}
          >
            {deletingId === expense.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export function ExpenseList({ expenses, currencyCode, onAdd, onToggleStatus, onEdit, onDelete, onReorder, pendingStatusId, deletingId, isAnyMutationPending }: ExpenseListProps) {
  const total = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || '0'), 0);
  const nonCardTotal = expenses
    .filter(exp => exp.kind !== 'CARD_BILL')
    .reduce((sum, exp) => sum + parseFloat(exp.amount || '0'), 0);

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
      const oldIndex = expenses.findIndex((item) => item.id === active.id);
      const newIndex = expenses.findIndex((item) => item.id === over.id);

      const reorderedItems = arrayMove(expenses, oldIndex, newIndex);
      onReorder(reorderedItems);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">Expenses</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Total: <span className="font-mono font-semibold" data-testid="text-expense-total">
              {formatCurrency(total, currencyCode)}
            </span>
            {' '} | Non-Card: <span className="font-mono font-semibold" data-testid="text-expense-non-card-total">
              {formatCurrency(nonCardTotal, currencyCode)}
            </span>
          </p>
        </div>
        <Button
          size="icon"
          onClick={onAdd}
          data-testid="button-add-expense"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No expenses yet. Add your first one!
          </p>
        ) : (
          <div className="relative">
            {isAnyMutationPending && (
              <div className="absolute inset-0 bg-background/50 z-10 rounded-lg" />
            )}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={expenses.map(exp => exp.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {expenses.map((expense) => (
                    <SortableExpenseItem
                      key={expense.id}
                      expense={expense}
                      currencyCode={currencyCode}
                      pendingStatusId={pendingStatusId}
                      deletingId={deletingId}
                      onToggleStatus={onToggleStatus}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
