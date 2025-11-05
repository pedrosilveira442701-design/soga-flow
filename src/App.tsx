import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Leads from "./pages/Leads";
import Propostas from "./pages/Propostas";
import Contratos from "./pages/Contratos";
import Financeiro from "./pages/Financeiro";
import Metas from "./pages/Metas";
import Visitas from "./pages/Visitas";
import Arquivos from "./pages/Arquivos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
          <Route path="/clientes" element={<DashboardLayout><Clientes /></DashboardLayout>} />
          <Route path="/leads" element={<DashboardLayout><Leads /></DashboardLayout>} />
          <Route path="/propostas" element={<DashboardLayout><Propostas /></DashboardLayout>} />
          <Route path="/contratos" element={<DashboardLayout><Contratos /></DashboardLayout>} />
          <Route path="/financeiro" element={<DashboardLayout><Financeiro /></DashboardLayout>} />
          <Route path="/metas" element={<DashboardLayout><Metas /></DashboardLayout>} />
          <Route path="/visitas" element={<DashboardLayout><Visitas /></DashboardLayout>} />
          <Route path="/arquivos" element={<DashboardLayout><Arquivos /></DashboardLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
