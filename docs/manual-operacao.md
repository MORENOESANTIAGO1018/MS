# Manual de Operação — Portal do Cliente

Guia do dia a dia para a equipe do escritório (staff/admin) usar o painel
administrativo. Para instalação de um ambiente novo, ver `manual-instalacao.md`; para
um incidente (vazamento, indisponibilidade, deploy quebrado), ver
`manual-recuperacao.md`.

## 1. Papéis

- **admin**: acesso a todos os clientes e a todas as telas administrativas, incluindo
  `/admin/usuarios`, `/admin/permissoes` e `/admin/logs`.
- **staff**: só acessa clientes aos quais foi formalmente atribuído em
  `/admin/permissoes` — atribuição própria (`client_access`, `access_level = 'staff'`).
  Um staff sem atribuição não vê nem consegue criar registros para um cliente, mesmo
  estando autenticado (a RLS bloqueia no banco, não só a interface).
- **client**: o próprio cliente, só vê o que estiver marcado como visível/publicado
  para ele.

## 2. Trazer um cliente para o portal

1. `/admin/clientes` → criar o cadastro do cliente (nome, e-mail, etc.), OU deixar
   que a sincronização com o Notion (`/admin/sincronizacao`) traga automaticamente
   quando o registro no Notion tiver "Portal ativo" marcado.
2. `/admin/permissoes` → atribuir um staff responsável, se aplicável (admins já veem
   tudo por padrão).
3. Convidar o cliente: no card de convite em `/admin/clientes`, gera um código de
   ativação de uso único. Se `N8N_BASE_URL`/`N8N_TRIGGER_TOKEN` estiverem
   configurados, o e-mail com o código sai automaticamente (workflow n8n
   "02-criacao-de-convite"); caso contrário, o código aparece na tela para envio
   manual (WhatsApp, telefone, etc.) — nunca reenvie por um canal não verificado.
4. O cliente acessa `/ativar`, informa e-mail + código, e define a própria senha.

## 3. Publicar um andamento processual

Duas formas, ambas terminando na mesma trava (nunca é possível deixar algo visível ao
cliente sem uma decisão humana explícita):

- **Manual**: `/admin/andamentos` → preencher o resumo em linguagem simples e marcar
  "Publicar no portal imediatamente".
- **Assistido por IA**: preencher também o campo "Texto original" ao registrar o
  andamento, depois usar "Gerar resumo com IA" na mesma tela. A sugestão aparece em
  `/admin/resumos-ia`, aguardando revisão — a equipe pode editar o texto sugerido
  antes de aprovar, e só marcando "Publicar no portal" no momento da aprovação é que o
  cliente passa a ver o andamento. Rejeitar descarta a sugestão sem tocar em nada
  visível ao cliente.

O mesmo padrão vale para documentos (`/admin/documentos` → "Enviar documento para um
cliente", com as caixas "Sigiloso" e "Publicar no portal" sempre explícitas e mutuamente
exclusivas).

## 4. Financeiro

- `/admin/financeiro` → criar lançamento, atualizar status (pago/pendente/vencido/
  etc.), anexar comprovante (upload direto na tela, mesmo fluxo de segurança dos
  documentos — tamanho/tipo/antivírus).
- O cliente vê seu extrato em `/financeiro` e pode baixar um PDF a qualquer momento
  ("Baixar extrato em PDF").
- Se o workflow n8n "04-alerta-vencimento-financeiro" estiver ativo, lançamentos
  entram automaticamente em "a vencer" (3 dias antes) e "vencido" (após o vencimento),
  cada transição gerando uma notificação no portal — sem duplicar, mesmo rodando
  várias vezes por dia.

## 5. Auditoria e monitoramento do dia a dia

- `/admin/dashboard`: indicadores agregados (clientes ativos, processos ativos,
  prazos/audiências nos próximos 7 dias, financeiro vencido, documentos/resumos de IA
  pendentes de revisão).
- `/admin/logs`: acesso (quem viu o quê) e auditoria (quem mudou o quê) — só admin
  enxerga (RLS restringe).
- `/admin/relatorios`: agregados por área jurídica, status de cliente, financeiro
  recebido/pendente.
- Se o workflow n8n "11-relatorio-diario-admin" estiver ativo, a equipe recebe um
  resumo diário por e-mail nos dias úteis, sem precisar entrar no painel.

## 6. Gestão de usuários e acesso

- `/admin/usuarios`: bloquear um usuário (impede login imediatamente) e revogar
  sessões ativas (`supabase.auth.admin.signOut`, força relogin em todos os
  dispositivos).
- `/admin/permissoes`: atribuir/revogar staff a um cliente. Revogar exige confirmação
  explícita na própria tela (modal "Tem certeza?") antes de aplicar.

## 7. Quando algo parece errado

- Cliente diz que não vê um processo/documento que deveria: confira se
  `is_visible_to_client` está marcado na tela correspondente — a causa quase sempre é
  publicação pendente, não um bug de permissão (a RLS é a mesma para todos os
  clientes; um problema de "só esse cliente não vê" é sinal de dado não publicado,
  não de acesso negado incorretamente).
- Sincronização do Notion parece parada: `/admin/sincronizacao` mostra o histórico e
  tem um botão de disparo manual, sem depender do n8n estar no ar.
- Algo mais sério (indisponibilidade, suspeita de incidente de segurança): ver
  `manual-recuperacao.md`.
