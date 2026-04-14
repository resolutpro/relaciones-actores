import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  Map,
  Users,
  GitBranch,
  Share2,
  Download,
  LogOut,
  Menu,
  X,
  Building2,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Mapa", icon: Map },
  { href: "/actores", label: "Actores", icon: Users },
  { href: "/relaciones", label: "Relaciones", icon: GitBranch },
  { href: "/grafo", label: "Red de Relaciones", icon: Share2 },
  { href: "/exportar", label: "Exportar", icon: Download },
];

export default function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { username, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-40 w-64 flex flex-col
          bg-sidebar text-sidebar-foreground shadow-xl
          transition-transform duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary/20">
            <Building2 size={20} className="text-sidebar-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold text-sm leading-none text-sidebar-foreground">
              Mapa Corporativo
            </p>
            <p className="text-xs text-sidebar-foreground/60 mt-0.5">
              Gestión de actores
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors duration-100
                ${
                  isActive(href)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                }
              `}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-sidebar-border">
          <div className="flex items-center justify-between px-3 py-2">
            <div>
              <p className="text-xs font-medium text-sidebar-foreground/80">
                {username}
              </p>
              <p className="text-xs text-sidebar-foreground/50">Administrador</p>
            </div>
            <button
              onClick={() => logout()}
              className="p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-sidebar border-b border-sidebar-border">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
          >
            <Menu size={20} />
          </button>
          <span className="font-semibold text-sm text-sidebar-foreground">
            Mapa Corporativo
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
