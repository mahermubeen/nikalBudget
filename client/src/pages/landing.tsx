import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { Wallet, CreditCard, TrendingUp, Calculator } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <h1 className="text-xl font-bold text-primary">Budget Nikal</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="max-w-4xl w-full space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Smart Budget Management
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Track your income, manage credit cards with intelligent cycle prediction, 
              and plan cash withdrawals with ease.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 py-8">
            <div className="flex flex-col items-center text-center space-y-3 p-6">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Budget Planning</h3>
              <p className="text-sm text-muted-foreground">
                Organize income and expenses by month
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-3 p-6">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Card Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Automatic statement & due date prediction
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-3 p-6">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Smart Calculations</h3>
              <p className="text-sm text-muted-foreground">
                Real-time totals and financial insights
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-3 p-6">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Cash-Out Planner</h3>
              <p className="text-sm text-muted-foreground">
                Optimize card withdrawals intelligently
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center space-y-4">
            <Button 
              size="lg" 
              className="text-lg px-8 h-12"
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-login"
            >
              Get Started
            </Button>
            <p className="text-sm text-muted-foreground">
              Sign in to manage your budget
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
