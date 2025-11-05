import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Clientes from "./pages/Clientes";
import Leads from "./pages/Leads";
import Propostas from "./pages/Propostas";
import Contratos from "./pages/Contratos";
import Financeiro from "./pages/Financeiro";
import Metas from "./pages/Metas";
import Visitas from "./pages/Visitas";
import Arquivos from "./pages/Arquivos";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><DashboardLayout><Analytics /></DashboardLayout></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><DashboardLayout><Clientes /></DashboardLayout></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute><DashboardLayout><Leads /></DashboardLayout></ProtectedRoute>} />
            <Route path="/propostas" element={<ProtectedRoute><DashboardLayout><Propostas /></DashboardLayout></ProtectedRoute>} />
            <Route path="/contratos" element={<ProtectedRoute><DashboardLayout><Contratos /></DashboardLayout></ProtectedRoute>} />
            <Route path="/financeiro" element={<ProtectedRoute><DashboardLayout><Financeiro /></DashboardLayout></ProtectedRoute>} />
            <Route path="/metas" element={<ProtectedRoute><DashboardLayout><Metas /></DashboardLayout></ProtectedRoute>} />
            <Route path="/visitas" element={<ProtectedRoute><DashboardLayout><Visitas /></DashboardLayout></ProtectedRoute>} />
            <Route path="/arquivos" element={<ProtectedRoute><DashboardLayout><Arquivos /></DashboardLayout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
