import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import Upload from "@/pages/upload";
import Documents from "@/pages/documents";
import Reminders from "@/pages/reminders";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/sidebar";
import LoginPage from "@/pages/login";

function AuthenticatedApp() {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/upload" component={Upload} />
          <Route path="/documents" component={Documents} />
          <Route path="/reminders" component={Reminders} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function AppContent() {
  // Check authentication status using the centralized hook
  const { data: user, status } = useAuth();

  console.log('Auth check:', { status, user });

  // Show loading while checking auth
  if (status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated (user is null)
  if (user === null) {
    return <LoginPage />;
  }

  // Show main app if authenticated
  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
