import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Dashboard from "./pages/dashboard";
import Properties from "./pages/properties";
import PropertyDetail from "./pages/property-detail";
import Tenants from "./pages/tenants";
import Maintenance from "./pages/maintenance";
import RefurbTracker from "./pages/refurb";
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
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/properties" component={Properties} />
      <Route path="/properties/:id" component={PropertyDetail} />
      <Route path="/tenants" component={Tenants} />
      <Route path="/maintenance" component={Maintenance} />
      <Route path="/refurb" component={RefurbTracker} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
