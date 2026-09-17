import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Investigation } from "../types";
import StatusBadge from "../components/StatusBadge";

function formatCnpjInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  let out = digits;
  if (digits.length > 2) out = `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length > 5) out = `${out.slice(0, 6)}.${digits.slice(5)}`;
  if (digits.length > 8) out = `${out.slice(0, 10)}/${digits.slice(8)}`;
  if (digits.length > 12) out = `${out.slice(0, 15)}-${digits.slice(12)}`;
  return out;
}

export default function Dashboard() {
  const [cnpj, setCnpj] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<Investigation[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.listInvestigations().then(setRecent).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const investigation = await api.startInvestigation(cnpj);
      navigate(`/investigation/${investigation.id}`);
    } catch (err: any) {
      setError(err.message || "Erro ao iniciar investigação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-xl text-center mt-10 mb-12">
        <h1 className="text-3xl font-semibold mb-2">Investigação Empresarial</h1>
        <p className="text-muted mb-8">
          Informe um CNPJ para gerar um dossiê estruturado com dados públicos, evidências, fontes e índice de
          risco.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            value={cnpj}
            onChange={(e) => setCnpj(formatCnpjInput(e.target.value))}
            placeholder="00.000.000/0001-00"
            className="bg-panel border border-border rounded-lg px-4 py-3 text-lg text-center tracking-wide focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={loading || cnpj.replace(/\D/g, "").length !== 14}
            className="bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg py-3 transition"
          >
            {loading ? "Investigando..." : "Investigar"}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </form>
      </div>

      <div className="w-full max-w-3xl">
        <h2 className="text-sm uppercase tracking-wide text-muted mb-3">Investigações recentes</h2>
        <div className="space-y-2">
          {recent.length === 0 && <p className="text-muted text-sm">Nenhuma investigação ainda.</p>}
          {recent.map((inv) => (
            <button
              key={inv.id}
              onClick={() => navigate(`/investigation/${inv.id}`)}
              className="w-full flex items-center justify-between bg-panel border border-border rounded-lg px-4 py-3 hover:border-accent/50 transition text-left"
            >
              <div>
                <p className="font-medium">{inv.company_name || inv.cnpj}</p>
                <p className="text-xs text-muted">{inv.cnpj}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={inv.status} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
