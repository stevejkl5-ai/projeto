const LABELS: Record<string, { label: string; className: string }> = {
  available: { label: "✓ Disponível", className: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" },
  needs_api_key: { label: "⚠ API Key necessária", className: "text-amber-400 border-amber-400/30 bg-amber-400/10" },
  commercial: { label: "⚪ Comercial", className: "text-muted border-border bg-panel2" },
  mock: { label: "MOCK", className: "text-amber-400 border-amber-400/30 bg-amber-400/10" },
  error: { label: "✕ Erro", className: "text-red-400 border-red-400/30 bg-red-400/10" },
  done: { label: "Concluída", className: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" },
  running: { label: "Em execução", className: "text-accent border-accent/30 bg-accentSoft/40" },
  pending: { label: "Pendente", className: "text-muted border-border bg-panel2" }
};

export default function StatusBadge({ status }: { status: string }) {
  const cfg = LABELS[status] || { label: status, className: "text-muted border-border bg-panel2" };
  return <span className={`text-xs px-2 py-1 rounded-full border whitespace-nowrap ${cfg.className}`}>{cfg.label}</span>;
}
