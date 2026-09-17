import fetch from "node-fetch";
import { ConnectorResult, ConnectorStatus } from "../types";

export async function timedFetch(
  connectorId: string,
  url: string,
  options: any = {},
  timeoutMs = 8000
): Promise<{ ok: boolean; json?: any; text?: string; status?: number; ms: number; error?: string }> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal as any });
    const ms = Date.now() - start;
    const contentType = res.headers.get("content-type") || "";
    if (!res.ok) {
      return { ok: false, status: res.status, ms, error: `HTTP ${res.status}` };
    }
    if (contentType.includes("application/json")) {
      const json = await res.json();
      return { ok: true, json, status: res.status, ms };
    }
    const text = await res.text();
    return { ok: true, text, status: res.status, ms };
  } catch (err: any) {
    const ms = Date.now() - start;
    return { ok: false, ms, error: err?.message || "Erro de conexão / timeout" };
  } finally {
    clearTimeout(timeout);
  }
}

export function mockResult(connectorId: string, data: any, ms = 5): ConnectorResult {
  return {
    connectorId,
    status: "mock",
    data,
    isMock: true,
    responseTimeMs: ms,
    sourceUrl: undefined
  };
}

export function needsApiKeyResult(connectorId: string): ConnectorResult {
  return {
    connectorId,
    status: "needs_api_key",
    data: null,
    isMock: false,
    responseTimeMs: 0,
    error: "API KEY NECESSÁRIA"
  };
}

export function commercialResult(connectorId: string): ConnectorResult {
  return {
    connectorId,
    status: "commercial",
    data: null,
    isMock: false,
    responseTimeMs: 0,
    error: "INTEGRAÇÃO COMERCIAL"
  };
}

export function errorResult(connectorId: string, error: string, ms = 0): ConnectorResult {
  return {
    connectorId,
    status: "error",
    data: null,
    isMock: false,
    responseTimeMs: ms,
    error
  };
}

export function cleanCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}
