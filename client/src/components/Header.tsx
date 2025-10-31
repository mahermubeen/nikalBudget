import { Button } from "@/components/ui/button";
import { Settings, LogOut } from "lucide-react";
import { useLocation } from "wouter";

interface HeaderProps {
  showSettings?: boolean;
  onLogout?: () => void;
}

export function Header({ showSettings = true, onLogout }: HeaderProps) {
  const [, setLocation] = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-primary">Budget Nikal</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {showSettings && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/settings')}
              data-testid="button-settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
          )}
          {onLogout && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
