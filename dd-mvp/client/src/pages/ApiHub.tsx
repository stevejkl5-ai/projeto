import { useEffect, useState } from "react";
import { api } from "../api";
import { ApiHubEntry } from "../types";
import StatusBadge from "../components/StatusBadge";

export default function ApiHub() {
  const [entries, setEntries] = useState<ApiHubEntry[]>([]);

  useEffect(() => {
    api.getApiHub().then(setEntries).catch(() => {});
  }, []);

  const categories = ["empresa", "governo", "reputacao", "comercial"];
  const categoryLabels: Record<string, string> = {
    empresa: "Empresas / Cadastro",
    governo: "Governo / Transparência",
    reputacao: "Reputação",
    comercial: "Integrações comerciais (futuras)"
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">API Hub</h1>
      <p className="text-muted text-sm mb-8">Status de todas as fontes e APIs integradas ou preparadas.</p>

      {categories.map((cat) => {
        const items = entries.filter((e) => e.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} className="mb-8">
            <h2 className="text-sm uppercase tracking-wide text-muted mb-3">{categoryLabels[cat]}</h2>
            <div className="space-y-2">
              {items.map((e) => (
                <div key={e.id} className="bg-panel border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{e.name}</span>
                    <StatusBadge status={e.status} />
                  </div>
                  <p className="text-sm text-muted mb-2">{e.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>
                      {e.isPaid ? "Paga" : "Gratuita"} · {e.requiresApiKey ? "Requer API key" : "Sem API key"} ·{" "}
                      {e.totalRequests} consulta(s)
                      {e.avgResponseTimeMs ? ` · ${e.avgResponseTimeMs}ms médio` : ""}
                    </span>
                    <a href={e.docsUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                      Documentação
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
