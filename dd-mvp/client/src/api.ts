import { ApiHubEntry, Investigation, InvestigationReport } from "./types";

const BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  startInvestigation: (cnpj: string): Promise<Investigation> =>
    fetch(`${BASE}/investigations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj })
    }).then((r) => handle(r)),

  listInvestigations: (): Promise<Investigation[]> => fetch(`${BASE}/investigations`).then((r) => handle(r)),

  getInvestigation: (id: string): Promise<InvestigationReport> =>
    fetch(`${BASE}/investigations/${id}`).then((r) => handle(r)),

  getApiHub: (): Promise<ApiHubEntry[]> => fetch(`${BASE}/api-hub`).then((r) => handle(r)),

  getApiHubUsage: (): Promise<{ usage: any[]; recent: any[] }> =>
    fetch(`${BASE}/api-hub/usage`).then((r) => handle(r))
};
