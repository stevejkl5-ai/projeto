import { Link, useLocation } from "react-router-dom";
import { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <header className="border-b border-border bg-panel px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          <span className="text-accent">DD</span> Investigação Empresarial
        </Link>
        <nav className="flex gap-6 text-sm">
          <Link to="/" className={isActive("/") ? "text-accent" : "text-muted hover:text-text"}>
            Dashboard
          </Link>
          <Link to="/api-hub" className={isActive("/api-hub") ? "text-accent" : "text-muted hover:text-text"}>
            API Hub
          </Link>
          <Link
            to="/api-hub/usage"
            className={isActive("/api-hub/usage") ? "text-accent" : "text-muted hover:text-text"}
          >
            Uso de APIs
          </Link>
        </nav>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">{children}</main>
      <footer className="text-center text-xs text-muted py-4 border-t border-border">
        MVP de Due Diligence — dados de fontes públicas. Não constitui parecer jurídico ou financeiro.
      </footer>
    </div>
  );
}
