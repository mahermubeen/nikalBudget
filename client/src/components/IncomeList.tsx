import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Loader2, GripVertical } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/dateUtils";
import { StatusBadge } from "./StatusBadge";
import { RecurringBadge } from "./RecurringBadge";
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

interface Income {
  id: string;
  source: string;
  amount: string;
  recurring: boolean;
  status: string;
  paidDate: string | null;
  displayOrder: number;
  budgetId: string;
  createdAt: Date | null;
}

interface IncomeListProps {
  incomes: Income[];
  currencyCode: string;
  onAdd: () => void;
  onToggleStatus: (id: string, currentStatus: string) => void;
  onEdit: (income: Income) => void;
  onDelete: (id: string) => void;
  onReorder: (items: Income[]) => void;
  pendingStatusId?: string | null;
  deletingId?: string | null;
  isAnyMutationPending?: boolean;
}

interface SortableIncomeItemProps {
  income: Income;
  currencyCode: string;
  pendingStatusId?: string | null;
  deletingId?: string | null;
  onToggleStatus: (id: string, currentStatus: string) => void;
  onEdit: (income: Income) => void;
  onDelete: (id: string) => void;
}

function SortableIncomeItem({ income, currencyCode, pendingStatusId, deletingId, onToggleStatus, onEdit, onDelete }: SortableIncomeItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: income.id });

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
      data-testid={`item-income-${income.id}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="relative flex items-center justify-center h-5 w-5">
        {pendingStatusId === income.id ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <Checkbox
            checked={income.status === 'done'}
            onCheckedChange={() => onToggleStatus(income.id, income.status)}
            className="h-5 w-5"
            data-testid={`checkbox-income-${income.id}`}
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium" data-testid={`text-income-source-${income.id}`}>
            {income.source}
          </span>
          {income.recurring && <RecurringBadge />}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <StatusBadge status={income.status as 'pending' | 'done'} />
          {income.paidDate && (
            <span className="text-xs text-muted-foreground" data-testid={`text-income-paid-date-${income.id}`}>
              Paid: {formatDate(income.paidDate)}
            </span>
          )}
        </div>
      </div>

      <div className="font-mono font-semibold text-success" data-testid={`text-income-amount-${income.id}`}>
        {formatCurrency(income.amount, currencyCode)}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(income)}
          data-testid={`button-edit-income-${income.id}`}
          disabled={deletingId === income.id}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(income.id)}
          data-testid={`button-delete-income-${income.id}`}
          disabled={deletingId === income.id}
        >
          {deletingId === income.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function IncomeList({ incomes, currencyCode, onAdd, onToggleStatus, onEdit, onDelete, onReorder, pendingStatusId, deletingId, isAnyMutationPending }: IncomeListProps) {
  const total = incomes.reduce((sum, inc) => sum + parseFloat(inc.amount || '0'), 0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = incomes.findIndex((item) => item.id === active.id);
      const newIndex = incomes.findIndex((item) => item.id === over.id);

      const reorderedItems = arrayMove(incomes, oldIndex, newIndex);
      onReorder(reorderedItems);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">Income</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Total: <span className="font-mono font-semibold" data-testid="text-income-total">
              {formatCurrency(total, currencyCode)}
            </span>
          </p>
        </div>
        <Button
          size="icon"
          onClick={onAdd}
          data-testid="button-add-income"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {incomes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No income items yet. Add your first one!
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
                items={incomes.map(inc => inc.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {incomes.map((income) => (
                    <SortableIncomeItem
                      key={income.id}
                      income={income}
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
