import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import NewCount from "@/pages/new-count";
import StartCount from "@/pages/start-count";
import History from "@/pages/history";
import CountSuccess from "@/pages/count-success";
import Products from "@/pages/products";
import Stocks from "@/pages/stocks";

import { Home as HomeIcon, Package, Plus, Warehouse } from "lucide-react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/start-count" component={StartCount} />
      <Route path="/count/:id" component={NewCount} />
      <Route path="/count/:id/success" component={CountSuccess} />
      <Route path="/stocks" component={Stocks} />
      
      <Route path="/history" component={History} />
      <Route path="/products" component={Products} />
      <Route>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Página não encontrada</h1>
            <p className="text-gray-600">A página que você está procurando não existe.</p>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="max-w-sm mx-auto bg-white min-h-screen relative overflow-hidden">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
