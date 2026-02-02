import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ScrollToTop from "@/components/scroll-to-top";
import Router from "./router";
import MaintenanceScreen from "@/components/maintenance-screen";

function App() {
  const maintenanceEnabled =
    import.meta.env.VITE_MAINTENANCE_MODE === "true";

  if (maintenanceEnabled) {
    return <MaintenanceScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ScrollToTop />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
