# Módulos de domínio

Cada subpasta representa um módulo de negócio, não uma camada técnica. Convenção de
arquivos dentro de cada módulo:

- `types.ts` — tipos de domínio do módulo.
- `schema.ts` — schemas Zod de validação de entrada.
- `queries.ts` — leitura de dados, seguro para uso em Server Components (respeita RLS,
  usa `@/lib/supabase/server`).
- `actions.ts` — Server Actions de mutação que **não** exigem service role (RLS
  aplicada, cliente autenticado).
- `*.actions.server.ts` — ações que precisam de `@/lib/server/*` (service role, Notion,
  Claude). Nome termina em `.server.ts` para ficar explícito e liberado pela regra de
  ESLint `no-restricted-imports` (ver `.eslintrc.json`).

Módulos previstos: `auth`, `clients`, `processes`, `hearings`, `deadlines`,
`contracts`, `financial`, `documents`, `messages`, `notifications`, `notion-sync`,
`ai-summaries`, `admin`, `support`.
