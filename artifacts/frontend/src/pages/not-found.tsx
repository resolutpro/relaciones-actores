import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <h1 className="text-3xl font-bold text-foreground">404</h1>
        </div>
        <p className="text-lg font-medium text-foreground mb-2">
          Página no encontrada
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          La página que buscas no existe o ha sido movida.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
