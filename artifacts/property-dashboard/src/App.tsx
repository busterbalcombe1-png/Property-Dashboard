import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider, useAuth } from "@/contexts/auth-context";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import Properties from "./pages/properties";
import PropertyDetail from "./pages/property-detail";
import Tenants from "./pages/tenants";
import TenantDetail from "./pages/tenant-detail";
import Maintenance from "./pages/maintenance";
import RefurbTracker from "./pages/refurb";
import RentTracking from "./pages/rent";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function Router() {
  const { user } = useAuth();

  if (!user) return <Login />;

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/properties" component={Properties} />
      <Route path="/properties/:id" component={PropertyDetail} />
      <Route path="/tenants" component={Tenants} />
      <Route path="/tenants/:id" component={TenantDetail} />
      <Route path="/maintenance" component={Maintenance} />
      <Route path="/refurb" component={RefurbTracker} />
      <Route path="/rent" component={RentTracking} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
