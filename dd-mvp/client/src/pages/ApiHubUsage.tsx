import { useEffect, useState } from "react";
import { api } from "../api";

export default function ApiHubUsage() {
  const [data, setData] = useState<{ usage: any[]; recent: any[] } | null>(null);

  useEffect(() => {
    api.getApiHubUsage().then(setData).catch(() => {});
  }, []);

  if (!data) return <p className="text-muted">Carregando...</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Uso de APIs</h1>

      <div className="bg-panel border border-border rounded-xl overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-panel2 text-muted text-left">
            <tr>
              <th className="p-3">API</th>
              <th className="p-3">Consultas</th>
              <th className="p-3">Tempo médio</th>
              <th className="p-3">Custo estimado</th>
            </tr>
          </thead>
          <tbody>
            {data.usage.map((u, i) => (
              <tr key={i} className="border-t border-border">
                <td className="p-3">{u.connector_id}</td>
                <td className="p-3">{u.total}</td>
                <td className="p-3">{Math.round(u.avg_ms || 0)}ms</td>
                <td className="p-3">R$ {(u.total_cost || 0).toFixed(2)}</td>
              </tr>
            ))}
            {data.usage.length === 0 && (
              <tr>
                <td className="p-3 text-muted" colSpan={4}>
                  Nenhuma consulta registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="text-sm uppercase tracking-wide text-muted mb-3">Requisições recentes</h2>
      <div className="space-y-1">
        {data.recent.slice(0, 30).map((r) => (
          <div key={r.id} className="flex items-center justify-between text-xs bg-panel border border-border rounded p-2">
            <span>{r.connector_id}</span>
            <span className="text-muted">{r.status}</span>
            <span className="text-muted">{r.response_time_ms}ms</span>
            <span className="text-muted">{new Date(r.timestamp).toLocaleString("pt-BR")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
