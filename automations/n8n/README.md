# Automações n8n — Fase 11

Estes 12 workflows são exports do n8n (`Import from File` em qualquer instância n8n
self-hosted ou cloud). Nenhum deles dá ao n8n acesso direto ao banco de dados — cada
um chama um endpoint do portal (sentido n8n → portal) ou recebe um webhook disparado
pelo próprio portal (sentido portal → n8n), conforme o princípio arquitetural descrito
em `ARQUITETURA.md` ("n8n não tem acesso direto ao banco").

## Duas direções, dois segredos

| Direção | Quem chama | Segredo usado | Header |
|---|---|---|---|
| n8n → portal (jobs agendados) | n8n | `N8N_WEBHOOK_SECRET` | `x-n8n-secret` |
| portal → n8n (eventos transacionais) | Next.js (server-only) | `N8N_TRIGGER_TOKEN` | `x-portal-token` |

Os dois segredos são independentes — nunca reutilize um para o outro sentido. Ambos
são comparados em tempo constante (`timingSafeEqual`) no lado que os valida.

## Variáveis de ambiente esperadas na instância n8n

Configure estas variáveis no ambiente do n8n (não no Next.js — o Next.js já tem as
suas próprias, ver `VARIAVEIS-DE-AMBIENTE.md`):

| Variável | Uso |
|---|---|
| `APP_BASE_URL` | URL pública do portal (ex.: `https://portal.morenoesantiago.com`) |
| `N8N_WEBHOOK_SECRET` | Mesmo valor configurado no Next.js — autentica as chamadas n8n → portal |
| `N8N_TRIGGER_TOKEN` | Mesmo valor configurado no Next.js — valida as chamadas portal → n8n |
| `SMTP_FROM` | E-mail remetente das notificações |
| `OFFICE_STAFF_EMAIL` | Caixa de entrada da equipe, para alertas internos (09, 11) |

Além disso, configure uma credencial SMTP no n8n (nó "Enviar e-mail") apontando para o
provedor de e-mail transacional do escritório. Nenhuma credencial de e-mail é mantida
pelo Next.js — o envio é responsabilidade exclusiva do n8n.

## Os 12 workflows

| # | Arquivo | Gatilho | O que faz |
|---|---|---|---|
| 01 | `01-sincronizacao-notion.json` | Agendado (20 min) | `POST /api/notion/sync` — traz clientes/processos/andamentos publicáveis do Notion |
| 02 | `02-criacao-de-convite.json` | Webhook `convite-criado` | E-mail com o código de ativação de um novo convite |
| 03 | `03-reenvio-codigo-ativacao.json` | Webhook `codigo-reenviado` | E-mail com um novo código, quando o anterior expira/é reenviado |
| 04 | `04-alerta-vencimento-financeiro.json` | Agendado (diário, 07:00) | `POST /api/notifications/payment-due` — marca `a_vencer`/`vencido` e cria notificações no portal |
| 05 | `05-lembrete-audiencia.json` | Agendado (diário, 08:00) | `POST /api/notifications/hearing-reminder` — lembrete 48h antes de audiências |
| 06 | `06-lembrete-prazo.json` | Agendado (diário, 08:15) | `POST /api/notifications/deadline-reminder` — lembrete 3 dias antes de prazos |
| 07 | `07-andamento-publicado.json` | Webhook `andamento-publicado` | E-mail ao cliente quando um andamento é publicado (manual ou via aprovação de IA) |
| 08 | `08-documento-publicado.json` | Webhook `documento-publicado` | E-mail ao cliente quando um documento fica visível no portal |
| 09 | `09-alerta-resumo-ia-pendente.json` | Agendado (diário, 09:00) | `POST /api/notifications/ai-summary-digest` — alerta a equipe se há resumos de IA aguardando revisão |
| 10 | `10-nova-mensagem.json` | Webhook `nova-mensagem` | E-mail para quem não enviou a mensagem (cliente ou equipe) |
| 11 | `11-relatorio-diario-admin.json` | Agendado (dias úteis, 18:00) | `GET /api/reports/daily-digest` — resumo diário de indicadores para a equipe |
| 12 | `12-purga-logs-antigos.json` | Agendado (semanal, domingo 03:00) | `POST /api/maintenance/purge-logs` — expurga logs além de `AUDIT_LOG_RETENTION_DAYS` |

## Idempotência

Os jobs agendados (01, 04, 05, 06, 09, 11, 12) são seguros para rodar mais de uma vez
seguida ou com sobreposição:

- 01 usa `notion_sync_logs.finished_at` da última sincronização bem-sucedida por
  entidade (sync incremental).
- 04, 05, 06 só notificam na transição de status (`pendente → a_vencer`,
  `client_notified = false → true`) — nunca duplicam notificação.
- 09 só cria uma notificação por dia, mesmo que a fila de revisão fique parada.
- 12 só apaga linhas mais antigas que o corte de retenção — repetir o job não tem
  efeito adicional além do que já foi expurgado.

## Payloads dos eventos transacionais (portal → n8n)

Cada webhook recebe um corpo JSON com os dados já prontos para o e-mail — o n8n nunca
precisa consultar o Supabase para resolver nome/e-mail do destinatário:

- `convite-criado`: `{ clientAccessId, clientId, email, fullName, code }`
- `codigo-reenviado`: `{ clientAccessId, clientId, email, fullName, code }`
- `andamento-publicado`: `{ processUpdateId, processId?, clientId, clientEmail, clientName }`
- `documento-publicado`: `{ documentId, clientId, clientEmail, clientName, name }`
- `nova-mensagem`: `{ clientId, senderRole, recipientEmail }`

## Segurança

- Todo endpoint chamado pelo n8n (sentido n8n → portal) também aceita uma sessão
  staff/admin autenticada, para permitir disparo manual pela equipe sem depender do
  n8n estar no ar (ver `authorizeAutomationRequest` em `src/lib/server/webhook-auth.ts`).
- Nenhum destes endpoints é acessível anonimamente — sem o segredo correto e sem
  sessão staff/admin, a resposta é `401`/`403`.
- `N8N_BASE_URL`/`N8N_TRIGGER_TOKEN` ausentes no Next.js fazem `notifyN8n` apenas
  logar um aviso e não fazer nada (mock silencioso) — nenhuma ação principal (criar
  convite, publicar andamento, etc.) falha por causa de uma automação opcional não
  configurada.
