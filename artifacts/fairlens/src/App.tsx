import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Upload from "@/pages/upload";
import Metrics from "@/pages/metrics";
import Archaeology from "@/pages/archaeology";
import Counterfactual from "@/pages/counterfactual";
import Mitigation from "@/pages/mitigation";
import Risk from "@/pages/risk";
import Monitoring from "@/pages/monitoring";
import Executive from "@/pages/executive";
import Legal from "@/pages/legal";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/monitoring" component={Monitoring} />
        <Route path="/executive" component={Executive} />
        <Route path="/legal" component={Legal} />
        <Route path="/upload" component={Upload} />
        <Route path="/metrics" component={Metrics} />
        <Route path="/archaeology" component={Archaeology} />
        <Route path="/counterfactual" component={Counterfactual} />
        <Route path="/mitigation" component={Mitigation} />
        <Route path="/risk" component={Risk} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="fairlens-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
