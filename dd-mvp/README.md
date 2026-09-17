# Due Diligence / Investigação Empresarial por CNPJ — MVP

MVP funcional que transforma um CNPJ em um dossiê estruturado: dados cadastrais, quadro
societário, investigação de sócios, OSINT, relacionamentos, evidências com fonte/URL/data,
e um **Índice de Risco (0–100) explicável** — nunca uma afirmação categórica de "empresa boa/ruim".

---

## 1. Stack

- **Backend**: Node.js + TypeScript + Express + SQLite (better-sqlite3)
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- Arquitetura de **connectors modulares** (`server/src/connectors/`), cada um seguindo a mesma
  interface (`Connector`), com status `available` / `needs_api_key` / `commercial` / `mock`.

---

## 2. Como rodar localmente

### Backend

```bash
cd server
cp .env.example .env    # edite se for usar API keys (ver seção 4)
npm install
npm run dev              # http://localhost:4000
```

### Frontend

Em outro terminal:

```bash
cd client
npm install
npm run dev               # http://localhost:5173 (proxy para /api -> :4000)
```

Abra `http://localhost:5173`, digite um CNPJ válido (ex.: `00.000.000/0001-91`) e clique em
**Investigar**.

### Build de produção

```bash
cd server && npm run build && npm start
cd client && npm run build   # gera client/dist — sirva com qualquer static host
```

### Deploy na Vercel

O frontend deve ser publicado na Vercel com `dd-mvp/client` como **Root Directory**. A Vercel usará
automaticamente `npm run build` e `dist` como diretório de saída. Configure no projeto da Vercel:

```text
VITE_API_URL=https://URL_PUBLICA_DO_BACKEND/api
```

O backend não deve usar a Vercel como função serverless nesta versão: ele depende do SQLite local para
persistência e pode executar uma investigação por vários segundos. Publique `dd-mvp/server` em um serviço
Node persistente (por exemplo, Render, Railway ou Fly.io), execute `npm install && npm run build` no build e
`npm start` no start, e configure no serviço:

```text
PORT=4000
CLIENT_ORIGIN=https://SEU_PROJETO.vercel.app
PORTAL_TRANSPARENCIA_API_KEY=sua-chave-do-portal
NEWS_API_KEY=sua-chave-da-newsapi
```

Nunca configure essas duas chaves como variáveis `VITE_*`, pois variáveis Vite são expostas no JavaScript do
navegador. O arquivo `client/vercel.json` mantém as rotas do React funcionando após o refresh.

---

## 3. Como rodar no Replit

1. Importe este projeto (ou os dois diretórios `server/` e `client/`) no Replit.
2. Configure os **Secrets** do Replit com as mesmas variáveis de `server/.env.example`
   (`PORTAL_TRANSPARENCIA_API_KEY`, `NEWS_API_KEY` — opcionais, ver seção 4).
3. Rode o backend (`npm install && npm run dev` dentro de `server/`) em uma porta, e o
   frontend (`npm install && npm run dev` dentro de `client/`) em outra — ou aponte o `vite.config.ts`
   (`server.proxy`) para a URL pública do backend no Replit.
4. Nunca coloque API keys no código do frontend — elas só existem no backend (`server/.env`,
   nunca commitado; use `.gitignore`).

---

## 4. APIs e fontes — status real

### ✅ Integradas e funcionando (gratuitas, sem API key)

| API | O que fornece | Documentação |
|---|---|---|
| **BrasilAPI** | Dados cadastrais de CNPJ (Receita Federal) — fonte primária | https://brasilapi.com.br/docs |
| **ReceitaWS** | Dados cadastrais de CNPJ — fallback/confirmação cruzada | https://www.receitaws.com.br/api |
| **Compras.gov.br (Dados Abertos)** | Fornecedores/licitações do governo federal | https://compras.dados.gov.br/docs/home.html |

### ⚠️ Integradas, mas exigem API key gratuita (cadastro simples)

| API | O que fornece | Como obter |
|---|---|---|
| **Portal da Transparência (CGU)** | Sanções administrativas: CEIS, CNEP, CEPIM | Cadastro gratuito em https://api.portaldatransparencia.gov.br/swagger-ui.html — gera uma chave e cola em `PORTAL_TRANSPARENCIA_API_KEY` |
| **NewsAPI.org** | Motor de OSINT (busca de notícias sobre empresa/sócios) | Cadastro gratuito em https://newsapi.org/register — cola em `NEWS_API_KEY` |

Sem essas keys, os dois connectors funcionam normalmente mas retornam resultados **MOCK**,
claramente marcados na interface (badge "MOCK DATA" / "API Key necessária").

### 🔶 Mockadas (sem API pública gratuita viável — documentado no código)

| Fonte | Motivo |
|---|---|
| **TCU** | Não há endpoint REST público estável confirmado para consulta direta por CNPJ; o Portal de Dados Abertos do TCU exporta CSVs, não uma API de busca simples. |
| **Reclame Aqui** | Não oferece API pública/gratuita; dados estruturados exigem parceria comercial (Reclame Aqui PRO). Scraping não foi implementado por violar os Termos de Uso. |
| **Glassdoor** | Sem API pública/gratuita; acesso oficial é via Glassdoor for Employers (comercial). |

### ⚪ Preparadas para integração comercial futura (não ativas)

Serasa Experian, API bancária Banco do Brasil, Caixa Econômica Federal — os connectors existem
em `server/src/connectors/commercialStubs.ts` com a interface pronta, mas não são chamados até
que exista contrato/API key configurada.

---

## 5. Arquitetura de connectors

Todo connector implementa:

```ts
interface Connector {
  id: string;
  name: string;
  description: string;
  category: "empresa" | "governo" | "reputacao" | "comercial";
  requiresApiKey: boolean;
  isPaid: boolean;
  docsUrl: string;
  isConfigured(): boolean;
  searchCompany?(cnpj: string): Promise<ConnectorResult>;
  searchPerson?(name: string): Promise<ConnectorResult>;
}
```

Isso permite adicionar uma nova fonte sem tocar no motor de investigação: basta criar o arquivo
em `server/src/connectors/` e registrá-lo em `registry.ts`.

---

## 6. Fluxo implementado (`server/src/services/investigationService.ts`)

```
CNPJ → BrasilAPI/ReceitaWS (dados cadastrais + QSA)
     → Portal da Transparência (sanções CEIS/CNEP)
     → Compras.gov.br (fornecedor do governo)
     → TCU (mock)
     → Reclame Aqui (mock)
     → OSINT sobre a empresa (buscas correlacionadas via NewsAPI/mock)
   → Perfil de cada sócio (sanções oficiais + buscas recentes contextualizadas)
     → Cálculo do Índice de Risco (motor explicável, pesos configuráveis)
     → Persistência de evidências, fontes, relacionamentos, timeline
     → Relatório estruturado (JSON) via GET /api/investigations/:id/report
```

Cada etapa registra a chamada em `api_requests` (para o API Hub / uso de APIs) e cada evidência
carrega fonte, URL, data e tipo — nunca é escondida a origem da informação.

---

## 7. Índice de Risco

- Score inicial: 100. Fatores negativos e positivos (pesos em
  `server/src/services/riskWeights.ts`, editável sem tocar no motor).
- Faixas: 80–100 Baixo · 60–79 Atenção · 40–59 Elevado · 0–39 Crítico.
- O sistema **nunca** afirma "empresa fraudulenta/criminosa/não confiável" sem uma fonte oficial
  que estabeleça isso — e mesmo assim, atribui a informação à fonte.
- Ausência de resultado em uma fonte é sempre apresentada como "nenhuma ocorrência encontrada
  **nas fontes consultadas**", nunca como "nenhum problema existe".
- Sanções oficiais de pessoas são fatores separados das sanções da empresa e exigem correspondência contextual por nome, empresa e cargo.
- Notícias de pessoas são avaliadas nos últimos 12 meses. Uma menção isolada permanece informativa; pelo menos duas notícias recentes, contextualizadas e com termos claros de investigação geram um alerta de `-8` para revisão manual.
- Notícias e correspondências nominais podem conter homônimos e não equivalem a condenação ou confirmação judicial.

---

## 8. Banco de dados

SQLite (`server/data/duediligence.sqlite`, criado automaticamente no primeiro boot) com as
tabelas: `investigations`, `companies`, `people`, `relationships`, `evidences`, `sources`,
`risk_factors`, `timeline_events`, `api_requests`.

---

## 9. Segurança implementada

- `.env` + `.gitignore` (API keys nunca no frontend nem versionadas)
- Validação de CNPJ com dígitos verificadores (`server/src/middleware/validation.ts`)
- Rate limiting (30 req/min por IP) via `express-rate-limit`
- Timeout de 8s em toda chamada externa (`connectors/base.ts`)
- `cors` restrito ao necessário; `express.json({ limit: "1mb" })` contra payloads grandes
- SQLite via `better-sqlite3` com **prepared statements** em 100% das queries (sem SQL injection)

---

## 10. O que foi deliberadamente deixado de fora (fase 2)

Conforme o escopo do MVP: Neo4j, sistema de pagamentos/assinatura, marketplace, app mobile,
agentes autônomos complexos, dezenas de gráficos.

---

## 11. Próximos passos recomendados

1. Obter as duas API keys gratuitas (Portal da Transparência, NewsAPI) para sair do modo mock
   nessas duas fontes.
2. Avaliar parceria comercial com Reclame Aqui (maior ganho de sinal de reputação no score).
3. Investigar exports de dados abertos do TCU (CSV/Dados Abertos) para um connector real, já
   que não há API REST simples de busca por CNPJ.
4. Adicionar exportação do relatório em PDF (o endpoint `/report` já devolve o JSON completo,
   pronto para alimentar um template de PDF).
5. Visualização gráfica de relacionamentos (grafo) — hoje é uma lista; um grafo simples com
   `react-flow` ou similar melhoraria a leitura de redes societárias complexas.
6. Deduplicação/correlação de pessoas com nomes semelhantes entre investigações diferentes.
7. Quando volume justificar, avaliar migração do grafo de relacionamentos para Neo4j (fora do
   escopo deste MVP por decisão explícita).
