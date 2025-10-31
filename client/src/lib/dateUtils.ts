import { format, addMonths, getDaysInMonth, setDate, differenceInDays, parseISO } from 'date-fns';

export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  return format(date, 'MMM d, yyyy');
}

export function formatMonthYear(year: number, month: number): string {
  const date = new Date(year, month - 1);
  return format(date, 'MMMM yyyy');
}

export function getMonthName(month: number): string {
  const date = new Date(2000, month - 1);
  return format(date, 'MMMM');
}

// Predict next month's statement and due dates for credit card
export function predictNextMonthDates(
  currentStatementDate: string,
  dayDifference: number
): { statementDate: string; dueDate: string } {
  const currentDate = parseISO(currentStatementDate);
  
  // Move to next month, same day
  let nextStatementDate = addMonths(currentDate, 1);
  
  // Clamp to month end if needed
  const statementDay = currentDate.getDate();
  const nextMonthDays = getDaysInMonth(nextStatementDate);
  if (statementDay > nextMonthDays) {
    nextStatementDate = setDate(nextStatementDate, nextMonthDays);
  }
  
  // Calculate due date by adding day difference
  const nextDueDate = new Date(nextStatementDate);
  nextDueDate.setDate(nextDueDate.getDate() + dayDifference);
  
  return {
    statementDate: format(nextStatementDate, 'yyyy-MM-dd'),
    dueDate: format(nextDueDate, 'yyyy-MM-dd'),
  };
}

// Calculate day difference between two dates
export function calculateDayDifference(statementDate: string, dueDate: string): number {
  const statement = parseISO(statementDate);
  const due = parseISO(dueDate);
  return differenceInDays(due, statement);
}

// Get day of month from date string
export function getDayOfMonth(dateString: string): number {
  return parseISO(dateString).getDate();
}

// Create date string from year, month, day
export function createDateString(year: number, month: number, day: number): string {
  // Clamp day to valid range for the month
  const maxDay = getDaysInMonth(new Date(year, month - 1));
  const validDay = Math.min(day, maxDay);
  const date = new Date(year, month - 1, validDay);
  return format(date, 'yyyy-MM-dd');
}
