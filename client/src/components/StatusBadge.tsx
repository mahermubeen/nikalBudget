import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: 'pending' | 'done';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant={status === 'done' ? 'default' : 'secondary'}
      className={cn(
        "text-xs font-medium uppercase tracking-wide",
        status === 'done' && "bg-success text-success-foreground border-success",
        className
      )}
      data-testid={`badge-status-${status}`}
    >
      {status}
    </Badge>
  );
}
