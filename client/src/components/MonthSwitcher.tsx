import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonthYear } from "@/lib/dateUtils";

interface MonthSwitcherProps {
  year: number;
  month: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function MonthSwitcher({ year, month, onPrevious, onNext }: MonthSwitcherProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <Button
        variant="outline"
        size="icon"
        onClick={onPrevious}
        className="h-10 w-10"
        data-testid="button-month-previous"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      
      <h2 className="text-2xl font-semibold min-w-[200px] text-center" data-testid="text-current-month">
        {formatMonthYear(year, month)}
      </h2>
      
      <Button
        variant="outline"
        size="icon"
        onClick={onNext}
        className="h-10 w-10"
        data-testid="button-month-next"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
