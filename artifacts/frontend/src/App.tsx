import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ActoresPage from "@/pages/ActoresPage";
import RelacionesPage from "@/pages/RelacionesPage";
import ExportarPage from "@/pages/ExportarPage";

const GrafoPage = lazy(() => import("@/pages/GrafoPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function GrafoFallback() {
  return (
    <div className="flex h-full items-center justify-center bg-muted/30">
      <p className="text-muted-foreground text-sm">Cargando grafo...</p>
    </div>
  );
}

function ProtectedRoutes() {
  const { authenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Cargando...</div>
      </div>
    );
  }

  if (!authenticated) {
    return <Redirect to="/login" />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/actores" component={ActoresPage} />
        <Route path="/relaciones" component={RelacionesPage} />
        <Route path="/grafo">
          <Suspense fallback={<GrafoFallback />}>
            <GrafoPage />
          </Suspense>
        </Route>
        <Route path="/exportar" component={ExportarPage} />
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
    </Layout>
  );
}

function AppRoutes() {
  const { authenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Cargando...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login">
        {authenticated ? <Redirect to="/" /> : <LoginPage />}
      </Route>
      <Route>
        <ProtectedRoutes />
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AuthProvider>
          <AppRoutes />
          <Toaster />
        </AuthProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}
