import { Badge } from "@/components/ui/badge";
import { RotateCw } from "lucide-react";

export function RecurringBadge() {
  return (
    <Badge variant="outline" className="text-xs gap-1" data-testid="badge-recurring">
      <RotateCw className="h-3 w-3" />
      Recurring
    </Badge>
  );
}
