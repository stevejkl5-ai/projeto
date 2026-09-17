import { RiskFactor } from "../types";

function bandColor(band: string | null) {
  switch (band) {
    case "Baixo":
      return "text-emerald-400 border-emerald-400/30 bg-emerald-400/10";
    case "Atenção":
      return "text-amber-400 border-amber-400/30 bg-amber-400/10";
    case "Elevado":
      return "text-orange-400 border-orange-400/30 bg-orange-400/10";
    case "Crítico":
      return "text-red-400 border-red-400/30 bg-red-400/10";
    default:
      return "text-muted border-border bg-panel2";
  }
}

export default function RiskScoreCard({
  score,
  band,
  factors
}: {
  score: number | null;
  band: string | null;
  factors: RiskFactor[];
}) {
  return (
    <div className="bg-panel border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm uppercase tracking-wide text-muted">Índice de Risco</h3>
        {band && <span className={`text-xs px-2 py-1 rounded-full border ${bandColor(band)}`}>{band}</span>}
      </div>
      <div className="flex items-baseline gap-2 mb-6">
        <span className="text-5xl font-bold">{score ?? "—"}</span>
        <span className="text-muted">/ 100</span>
      </div>
      <p className="text-xs text-muted mb-4">
        Este índice é heurístico e explicável, calculado a partir das evidências encontradas nas fontes
        consultadas. Não é uma probabilidade estatística validada.
      </p>
      {factors.length > 0 && (
        <div className="space-y-2">
          {factors.map((f) => (
            <div key={f.id} className="flex items-center justify-between text-sm border-t border-border pt-2">
              <span className="text-text/90">{f.label}</span>
              <span className={f.category === "negative" ? "text-red-400 font-mono" : "text-emerald-400 font-mono"}>
                {f.weight > 0 ? `+${f.weight}` : f.weight}
              </span>
            </div>
          ))}
        </div>
      )}
      {factors.length === 0 && (
        <p className="text-sm text-muted italic">Nenhum fator de risco registrado ainda.</p>
      )}
      {factors.some((factor) => factor.label.includes("revisão manual")) && (
        <p className="text-xs text-amber-300/90 mt-4 border-t border-border pt-3">
          Notícias recentes contextualizadas entram como sinal de atenção e exigem validação humana.
        </p>
      )}
    </div>
  );
}
