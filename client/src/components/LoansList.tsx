import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, DollarSign, Pencil, Trash2, GripVertical } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/dateUtils";
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

interface LoanItem {
  id: string;
  name: string;
  installmentAmount: string;
  nextDueDate: string;
  recurring: boolean;
  displayOrder: number;
  userId: string;
  createdAt: Date | null;
}

interface LoansListProps {
  loans: LoanItem[];
  currencyCode: string;
  onAdd: () => void;
  onEdit: (loan: LoanItem) => void;
  onDelete: (id: string) => void;
  onReorder: (items: LoanItem[]) => void;
}

interface SortableLoanItemProps {
  loan: LoanItem;
  currencyCode: string;
  onEdit: (loan: LoanItem) => void;
  onDelete: (id: string) => void;
}

function SortableLoanItem({ loan, currencyCode, onEdit, onDelete }: SortableLoanItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: loan.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 rounded-lg border hover-elevate"
      data-testid={`item-loan-${loan.id}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
        <DollarSign className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold" data-testid={`text-loan-name-${loan.id}`}>
          {loan.name}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          Next due: {formatDate(loan.nextDueDate)}
        </div>
      </div>

      <div className="font-mono font-semibold" data-testid={`text-loan-amount-${loan.id}`}>
        {formatCurrency(loan.installmentAmount, currencyCode)}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(loan)}
          data-testid={`button-edit-loan-${loan.id}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(loan.id)}
          data-testid={`button-delete-loan-${loan.id}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function LoansList({ loans, currencyCode, onAdd, onEdit, onDelete, onReorder }: LoansListProps) {
  const total = loans.reduce((sum, loan) => sum + parseFloat(loan.installmentAmount || '0'), 0);

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
      const oldIndex = loans.findIndex((item) => item.id === active.id);
      const newIndex = loans.findIndex((item) => item.id === over.id);

      const reorderedItems = arrayMove(loans, oldIndex, newIndex);
      onReorder(reorderedItems);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">Loans</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Total: <span className="font-mono font-semibold" data-testid="text-loans-total">
              {formatCurrency(total, currencyCode)}
            </span>
          </p>
        </div>
        <Button
          size="icon"
          onClick={onAdd}
          data-testid="button-add-loan"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {loans.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No loans yet.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={loans.map(loan => loan.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {loans.map((loan) => (
                  <SortableLoanItem
                    key={loan.id}
                    loan={loan}
                    currencyCode={currencyCode}
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
