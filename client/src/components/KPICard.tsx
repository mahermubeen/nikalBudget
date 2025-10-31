import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  label: string;
  amount: string;
  subtext?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
  'data-testid'?: string;
}

export function KPICard({ 
  label, 
  amount, 
  subtext, 
  icon: Icon,
  variant = 'default',
  className,
  'data-testid': testId,
}: KPICardProps) {
  const variantStyles = {
    default: 'border-border',
    success: 'border-success/30 bg-success/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    danger: 'border-destructive/30 bg-destructive/5',
  };

  const textStyles = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-yellow-600 dark:text-yellow-500',
    danger: 'text-destructive',
  };

  return (
    <Card className={cn('min-h-32', variantStyles[variant], className)} data-testid={testId}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl sm:text-3xl font-bold font-mono", textStyles[variant])} data-testid={`${testId}-amount`}>
          {amount}
        </div>
        {subtext && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-1" data-testid={`${testId}-subtext`}>
            {subtext}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
