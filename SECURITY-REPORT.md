# Relatório de Segurança — Fase 13

Data da revisão: ver histórico do commit que introduz este arquivo. Escopo: todo o
código de `app/` e `src/` até o final da Fase 12, mais a própria Fase 13.

## 1. Metodologia

- Leitura de todas as políticas RLS (`supabase/migrations/0006_rls_policies.sql`) e
  comparação com o que cada Server Action/Route Handler realmente executa.
- Execução da suíte local de isolamento de RLS (`npm run db:test:rls`) contra um
  Postgres descartável, comprovando que cliente A nunca vê dado de cliente B, que
  staff só vê clientes atribuídos, e que até o próprio cliente não vê seus documentos
  confidenciais.
- Auditoria manual dos headers HTTP (`next.config.mjs`), do middleware de sessão
  (`middleware.ts`) e da política de importação de módulos server-only
  (`scripts/check-server-only-imports.ts` + regra ESLint equivalente).
- `npm audit` na árvore de dependências completa.
- Revisão de contraste de cor (WCAG AA) — ver `docs/design-system.md` (Fase 12,
  relacionado indiretamente: texto de baixo contraste não é uma falha de segurança,
  mas afeta a legibilidade de avisos de erro/status).

## 2. Achados corrigidos nesta fase

| # | Achado | Severidade | Correção |
|---|---|---|---|
| 1 | `.gitignore` tinha o padrão não ancorado `logs/`, que casava com `app/admin/logs/` em qualquer profundidade — a página de logs administrativos (acesso e auditoria) nunca foi commitada desde a Fase 6, apesar de funcionar localmente. Isso significa que, se o deploy tivesse sido feito a partir do que estava versionado antes desta correção, a equipe não teria acesso à tela de auditoria em produção. | Alta (indisponibilidade de uma ferramenta de auditoria, não exposição de dado) | Padrão ancorado para `/logs/`; página adicionada ao controle de versão. |
| 2 | CSP (`next.config.mjs`) liberava `connect-src` para `https://*.supabase.co`, `wss://*.supabase.co` e `https://api.anthropic.com`, mas nenhum Client Component chama esses domínios diretamente — toda integração externa é mediada pelo servidor. Um comentário no código também afirmava incorretamente que um nonce de CSP era aplicado por requisição em `middleware.ts`; isso nunca existiu. | Baixa/média (superfície de CSP mais larga que o necessário; falha de defesa em profundidade) | `connect-src` reduzido a `'self'`; comentário corrigido para refletir a arquitetura real (tudo mediado pelo servidor). |
| 3 | `src/lib/supabase/client.ts` (`createSupabaseBrowserClient`) existia desde a Fase 2 mas nunca foi importado por nenhum código — nenhum Client Component fala com o Supabase diretamente. Código morto que, se alguém começasse a usá-lo sem revisão, contornaria silenciosamente o padrão "tudo passa pelo servidor" desta arquitetura. | Baixa | Arquivo removido. Se uma necessidade real de acesso direto do navegador ao Supabase surgir (ex.: Realtime), deve ser reintroduzido deliberadamente, junto com a reabertura do `connect-src` correspondente. |
| 4 | `SEGURANCA-E-LGPD.md` continha referências desatualizadas de uma fase de planejamento anterior à implementação final: tabela inexistente `team_assignments` (o design real reaproveita `client_access` com `access_level = 'staff'`), caminho de teste inexistente (`tests/unit/logger.redaction.test.ts` em vez de `tests/unit/redact.test.ts`), convenção de nome de arquivo errada para Server Actions server-only (`*.actions.ts` em vez de `*actions.server.ts`), descrição de rate limiting como "middleware com token bucket" quando na verdade é uma tabela Postgres (`auth_rate_limits`) checada dentro das Server Actions, e uma alegação de mascaramento de CPF (`***.***.**last4`) que não existe em nenhuma tela hoje. | Baixa (documentação, não código) | Todas as referências corrigidas para refletir a implementação real. |

Nenhum destes achados expôs dado de um cliente a outro cliente, nem permitiu bypass de
autenticação — a suíte de isolamento de RLS permaneceu 100% verde durante toda a
revisão. São, em sua maioria, discrepâncias entre documentação/scaffolding inicial e o
que foi de fato implementado nas fases seguintes, mais uma falha de configuração de
`.gitignore` que já tinha efeito real (a página de logs nunca foi versionada).

## 3. `npm audit` — dependências

```
8 vulnerabilities (3 moderate, 4 high, 1 critical)
```

Todas as 3 cadeias de dependência vulneráveis são transitivas e **a correção sugerida
pelo próprio `npm audit fix --force` é rebaixar `next` para `9.3.3`** — uma versão sem
App Router, que quebraria o projeto inteiro. Essa "correção" automática não deve ser
aplicada. Detalhamento:

| Pacote | Severidade | Caminho | Risco real neste projeto |
|---|---|---|---|
| `esbuild` ≤0.24.2 | Moderada | `vitest` → `vite` → `esbuild` (dependência de desenvolvimento/teste) | A vulnerabilidade exige acesso à porta do servidor de desenvolvimento local (`vite dev`), que não roda em produção nem é exposto publicamente. Sem impacto no ambiente publicado. |
| `postcss` ≤8.5.11 | Alta | `next` (postcss embutido internamente pelo Next.js para seu próprio pipeline de build de CSS) | Explorável via CSS de origem não confiável processado no build; o CSS deste projeto é 100% autoral (Tailwind + arquivos próprios), nunca CSS enviado por usuário. Sem vetor de exploração aqui. |
| `sharp` <0.35.0 | Alta | `next` (otimização de imagem do `next/image`) | As CVEs de `libvips` importam quando `next/image` processa imagem de origem não confiável. Documentos e imagens de clientes ficam em Storage privado, acessados via URL assinada e link direto — não passam pelo otimizador `next/image`. Risco residual baixo, mas **monitorar**: se o app passar a usar `next/image` para renderizar upload de cliente, reavaliar antes. |

**Ação recomendada**: não aplicar `--force`. Acompanhar os avisos do `npm audit` em
cada PR (já roda implicitamente via `npm ci` + `npm audit` no pipeline de CI da Fase
15) e atualizar assim que o mantenedor do Next.js/Vitest publicar uma correção que não
exija downgrade.

## 4. Controles já implementados (confirmados, não é novidade desta fase)

- **RLS como linha de defesa primária** em todas as 20 tabelas de domínio — nenhuma
  delas é lida via chave anônima sem policy. Prova executável em
  `supabase/tests/rls_isolation.sql` (isolamento cliente-a-cliente, staff só no
  atribuído, admin vê tudo, storage nunca expõe documento confidencial nem para o
  próprio dono).
- **Segredos server-only nunca alcançam o navegador**: aplicado por convenção de
  arquivo (`*actions.server.ts`, `lib/server/**`, `app/api/**/route.ts`) mais dois
  mecanismos automatizados independentes (regra ESLint `no-restricted-imports` e
  `scripts/check-server-only-imports.ts`, que também varre por referência direta a
  `process.env.<SEGREDO>` fora desses locais).
- **PII nunca em log**: `src/lib/redact.ts` (aplicação) + trigger
  `redact_sensitive_jsonb` (Postgres, `audit_logs`) — duas camadas independentes.
- **Publicação é sempre um ato humano** (regra inegociável #10): `ai_summaries` sempre
  nasce `pending_review`; Notion só marca `is_visible_to_client=true` copiando um
  campo que já foi marcado por humano no Notion; nenhum caminho de código publica sem
  uma ação explícita de um `staff`/`admin` autenticado.
- **Automação n8n sem acesso direto ao banco** (Fase 11): duas direções autenticadas
  por segredos independentes (`N8N_WEBHOOK_SECRET` para n8n → portal,
  `N8N_TRIGGER_TOKEN` para portal → n8n), comparação em tempo constante
  (`timingSafeEqual`), payloads de saída já enriquecidos com o contato do destinatário
  para que o n8n nunca precise consultar o Supabase.
- **Rate limiting resistente a IP falsificado**: chaveado por identificador do alvo
  (e-mail), não por IP — falsificar `X-Forwarded-For` não contorna o limite.
- **Uploads**: validação de tamanho/MIME allowlist + verificação antivírus (mock/real
  via adaptador) antes de qualquer gravação no Storage; nunca em bucket público.
- **Ativação de conta**: código de uso único com hash HMAC-SHA256 + pepper server-only,
  consumo atômico via RPC Postgres (`consume_activation_code`) — sem race condition
  entre "verificar" e "marcar como usado".

## 5. Riscos residuais conhecidos (não corrigidos nesta fase — decisão consciente)

- **`X-Forwarded-For` não é reescrito/validado pela aplicação**: em produção atrás da
  borda da Vercel, esse cabeçalho é confiável; se o app for hospedado atrás de outro
  proxy no futuro, revisar antes de confiar nele para o hash de IP em `access_logs`
  (que é só telemetria/auditoria, não usado para autorização ou rate limit).
- **Nenhuma credencial real de Notion/Claude/n8n/SMTP está disponível neste ambiente
  de desenvolvimento** — todo o código correspondente foi implementado e testado
  contra os adaptadores mock (`hasCredential()` decide automaticamente), mas o
  caminho real (`RealNotionAdapter`, `RealClaudeAdapter`, envio de e-mail pelo n8n)
  não pôde ser exercitado contra um serviço externo de verdade. Ver
  `CHECKLIST-DE-PRODUCAO.md` para a lista de credenciais a configurar antes do go-live.
- **`npm audit`**: as 3 cadeias vulneráveis descritas na seção 3 — sem correção
  disponível que não quebre o projeto; risco residual avaliado como baixo no contexto
  deste app (ver justificativa por pacote acima).
