import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Investigation } from "../types";
import StatusBadge from "../components/StatusBadge";

type Module = "cnpj" | "cpf";

function formatCnpjInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  let out = digits;
  if (digits.length > 2) out = `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length > 5) out = `${out.slice(0, 6)}.${digits.slice(5)}`;
  if (digits.length > 8) out = `${out.slice(0, 10)}/${digits.slice(8)}`;
  if (digits.length > 12) out = `${out.slice(0, 15)}-${digits.slice(12)}`;
  return out;
}

function formatCpfInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length > 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  if (digits.length > 6) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  if (digits.length > 3) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  return digits;
}

function isValidCpf(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  const digitAt = (base: string, factor: number) => {
    const sum = base.split("").reduce((total, digit, index) => total + Number(digit) * (factor - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return Number(digits[9]) === digitAt(digits.slice(0, 9), 10) &&
    Number(digits[10]) === digitAt(digits.slice(0, 10), 11);
}

export default function Dashboard() {
  const [module, setModule] = useState<Module>("cnpj");
  const [cnpj, setCnpj] = useState("");
  const [cpf, setCpf] = useState("");
  const [name, setName] = useState("");
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
      const investigation = module === "cnpj"
        ? await api.startInvestigation(cnpj)
        : await api.startPersonInvestigation(cpf, name.trim());
      navigate(`/investigation/${investigation.id}`);
    } catch (err: any) {
      setError(err.message || "Erro ao iniciar investigação.");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = module === "cnpj"
    ? cnpj.replace(/\D/g, "").length === 14
    : isValidCpf(cpf) && name.trim().length >= 3;

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-xl text-center mt-10 mb-12">
        <h1 className="text-3xl font-semibold mb-2">Investigação de fontes públicas</h1>
        <p className="text-muted mb-8">
          Escolha o módulo para pesquisar dados cadastrais de uma empresa ou publicações públicas relacionadas a uma pessoa.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-5" role="tablist" aria-label="Tipo de investigação">
          <button
            type="button"
            role="tab"
            aria-selected={module === "cnpj"}
            onClick={() => { setModule("cnpj"); setError(null); }}
            className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
              module === "cnpj" ? "border-accent bg-accentSoft/30 text-accent" : "border-border bg-panel text-muted hover:text-text"
            }`}
          >
            Módulo CNPJ
            <span className="block text-xs font-normal mt-1">Empresa e quadro societário</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={module === "cpf"}
            onClick={() => { setModule("cpf"); setError(null); }}
            className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
              module === "cpf" ? "border-accent bg-accentSoft/30 text-accent" : "border-border bg-panel text-muted hover:text-text"
            }`}
          >
            Módulo CPF
            <span className="block text-xs font-normal mt-1">Pessoa e presença pública</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {module === "cnpj" ? (
            <>
              <input
                value={cnpj}
                onChange={(e) => setCnpj(formatCnpjInput(e.target.value))}
                placeholder="00.000.000/0001-00"
                aria-label="CNPJ"
                className="bg-panel border border-border rounded-lg px-4 py-3 text-lg text-center tracking-wide focus:outline-none focus:border-accent"
              />
              <p className="text-xs text-muted">Consulta cadastral, quadro societário, fontes oficiais e OSINT da empresa e dos sócios.</p>
            </>
          ) : (
            <>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome completo"
                aria-label="Nome completo da pessoa"
                autoComplete="name"
                maxLength={160}
                className="bg-panel border border-border rounded-lg px-4 py-3 text-base text-center focus:outline-none focus:border-accent"
              />
              <input
                value={cpf}
                onChange={(e) => setCpf(formatCpfInput(e.target.value))}
                placeholder="000.000.000-00"
                aria-label="CPF"
                inputMode="numeric"
                autoComplete="off"
                className="bg-panel border border-border rounded-lg px-4 py-3 text-lg text-center tracking-wide focus:outline-none focus:border-accent"
              />
              <p className="text-xs text-muted">
                O CPF é validado no servidor, mas não é salvo nem enviado às fontes. A busca usa o nome informado e resultados públicos.
              </p>
            </>
          )}
          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg py-3 transition"
          >
            {loading ? "Investigando..." : `Investigar ${module.toUpperCase()}`}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </form>
      </div>

      <div className="w-full max-w-3xl">
        <h2 className="text-sm uppercase tracking-wide text-muted mb-3">Investigações recentes</h2>
        <div className="space-y-2">
          {recent.length === 0 && <p className="text-muted text-sm">Nenhuma investigação ainda.</p>}
          {recent.map((inv) => {
            const isPerson = inv.target_type === "person";
            return (
              <button
                key={inv.id}
                onClick={() => navigate(`/investigation/${inv.id}`)}
                className="w-full flex items-center justify-between bg-panel border border-border rounded-lg px-4 py-3 hover:border-accent/50 transition text-left"
              >
                <div>
                  <p className="font-medium">{inv.target_name || inv.company_name || inv.cnpj}</p>
                  <p className="text-xs text-muted">{isPerson ? "Módulo CPF · busca por nome" : `Módulo CNPJ · ${inv.cnpj}`}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={inv.status} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
