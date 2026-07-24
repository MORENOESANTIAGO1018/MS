# Manual de Recuperação — Portal do Cliente

Procedimentos para incidentes: segredo comprometido, indisponibilidade,
deploy quebrado, ou suspeita de vazamento de dados. Ver também a seção 8 de
`SEGURANCA-E-LGPD.md` (resumo) — este documento é a versão detalhada e acionável.

## 1. Ativar o modo de manutenção

Sempre que uma correção exigir tirar o portal do ar por alguns minutos (rotação de
segredo, restauração de backup, migração de emergência):

1. Na Vercel, defina `MAINTENANCE_MODE=true` no projeto (Environment Variables) e
   faça um redeploy (ou, se a Vercel permitir mudar env var sem rebuild, aplique
   diretamente — `middleware.ts` lê a variável a cada requisição).
2. Todo tráfego passa a ver `/manutencao`, exceto a própria página — sem precisar de
   um deploy separado para "desligar" o site.
3. Ao terminar, defina `MAINTENANCE_MODE=false` (ou remova a variável) e redeploy.

## 2. Segredo comprometido — rotação

Qualquer suspeita de vazamento de uma das variáveis abaixo exige rotação imediata,
nesta ordem (mais crítico primeiro):

1. **`SUPABASE_SERVICE_ROLE_KEY`**: gerar uma nova chave no Supabase Dashboard
   (Settings > API > gerar nova service role key), atualizar na Vercel, redeploy.
   Esta chave ignora RLS — tratar como comprometimento total do banco até confirmar o
   contrário.
2. **`ACTIVATION_CODE_PEPPER`**: gerar um novo valor aleatório. Isso invalida todos os
   códigos de ativação pendentes (ainda não usados) — clientes com convite pendente
   precisam de um novo convite (`resendActivationCode`).
3. **`NOTION_TOKEN`** / **`ANTHROPIC_API_KEY`**: revogar a integração/chave antiga no
   respectivo painel (Notion: My Integrations; Anthropic: Console > API Keys), gerar
   uma nova, atualizar na Vercel.
4. **`N8N_WEBHOOK_SECRET`** / **`N8N_TRIGGER_TOKEN`**: gerar novos valores aleatórios,
   atualizar tanto na Vercel quanto nas variáveis de ambiente da instância n8n —
   os dois lados precisam do mesmo valor simultaneamente, então planeje uma janela
   curta em que as automações ficam temporariamente inativas.
5. **`SUPABASE_JWT_SECRET`** (se rotacionado pelo próprio Supabase): força logout de
   todos os usuários — avise a equipe antes.

Depois de qualquer rotação: confirme em `/admin/logs` que não há atividade suspeita
recente, e documente a rotação (data, motivo, quem executou) para o registro de
incidentes do escritório.

## 3. Revogar acesso de um usuário específico

`/admin/usuarios` → bloquear o usuário (impede novo login) e revogar sessões ativas
(`supabase.auth.admin.signOut`, invalida sessões já abertas em qualquer dispositivo).
Use isso para: ex-funcionário, dispositivo perdido/roubado, suspeita de conta
comprometida.

## 4. Restaurar de um backup do Supabase

1. No Supabase Dashboard (Database > Backups), identificar o ponto de restauração
   mais recente anterior ao incidente.
2. **Nunca restaurar diretamente sobre o projeto de produção sem antes clonar** para
   um projeto separado e validar os dados ali.
3. Após validar, seguir o procedimento de restauração point-in-time do Supabase (varia
   por plano — Pro/Team incluem PITR).
4. Após restaurar, rodar a suíte de isolamento de RLS
   (`TEST_DATABASE_URL=<connection-string> bash supabase/tests/run-local.sh` — cuidado:
   isso roda migrations/seed fictício, **não** rode contra produção; use apenas para
   validar um clone/staging antes de promover).
5. Reativar o tráfego normal (desligar `MAINTENANCE_MODE`).

## 5. Deploy quebrado (rollback)

1. Na Vercel, Deployments → localizar o último deployment saudável → "Promote to
   Production" (instantâneo, sem rebuild).
2. Investigar a causa raiz no branch com calma, sem pressa de re-deployar — o
   rollback já resolveu o impacto ao usuário.
3. Se o problema for um erro de runtime que passou pelo CI (`.github/workflows/ci.yml`
   já roda lint/typecheck/testes/build/E2E antes de qualquer merge), abra uma tarefa
   para reforçar a cobertura de teste que deveria ter pego o caso.

## 6. Suspeita de vazamento de dados de cliente (LGPD)

1. Conter: revogar a sessão/chave envolvida (seções 2 e 3), ativar
   `MAINTENANCE_MODE` se o vetor ainda estiver ativo.
2. Escopo: consultar `audit_logs`/`access_logs` (`/admin/logs`, ou diretamente via
   SQL com a service role) para determinar quais registros/clientes foram
   efetivamente acessados e por quem.
3. Avaliar se há risco relevante ao titular (Art. 48 LGPD) — se sim, notificar a ANPD
   e os titulares afetados, com apoio do encarregado de dados (DPO) do escritório.
   Este portal não automatiza essa notificação — é uma decisão humana, com prazo
   legal, que deve envolver o responsável jurídico pelo tratamento de dados.
4. Documentar: o que aconteceu, quando foi detectado, o que foi acessado, as ações de
   contenção, e a decisão sobre notificação — mesmo que a conclusão seja "não atingiu
   o limiar de notificação obrigatória".

## 7. Indisponibilidade do Supabase/Notion/Anthropic (fora do nosso controle)

- O portal já degrada graciosamente: `checkRateLimit`/`recordAccessLog`/
  `recordAuditLog` falham aberto (não derrubam login/ações principais) se o Supabase
  estiver momentaneamente indisponível — ver `SECURITY-REPORT.md`, seção 6.2.
- Se o Notion estiver fora do ar, a sincronização (`/admin/sincronizacao`) registra o
  erro em `notion_sync_logs` e simplesmente não atualiza nada — nenhum dado é
  corrompido, a próxima sincronização bem-sucedida retoma do zero do ponto salvo.
- Se a Claude API estiver fora do ar, "Gerar resumo com IA" retorna uma mensagem de
  erro amigável — nenhum resumo é publicado, a fila de revisão simplesmente não
  recebe itens novos até a API voltar.
- Nenhum desses cenários exige `MAINTENANCE_MODE` — o portal continua operacional
  para tudo que não depende do serviço externo específico.
