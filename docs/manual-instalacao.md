# Manual de Instalação — Portal do Cliente

Guia para colocar uma instância nova do Portal do Cliente no ar (ambiente de staging
ou produção). Para desenvolvimento local sem credenciais reais, ver `.env.example` e
a seção "Regra para credenciais ausentes" em `VARIAVEIS-DE-AMBIENTE.md` — este manual
assume que você está preparando um ambiente real, com credenciais reais.

## 1. Pré-requisitos

- Conta Vercel (hospedagem do Next.js).
- Projeto Supabase dedicado a este ambiente (nunca compartilhar o mesmo projeto entre
  staging e produção — ver `ARQUITETURA.md`, seção 8).
- Workspace Notion com as databases de Clientes, Processos, Andamentos, Audiências,
  Contratos, Financeiro e Documentos já criadas, e uma integração interna Notion
  autorizada nelas.
- Chave de API da Anthropic (Claude).
- Instância n8n (self-hosted ou cloud) — opcional para o primeiro deploy, mas
  necessária para as automações da Fase 11 funcionarem de fato.
- Node.js 20+ e acesso a este repositório.

## 2. Provisionar o Supabase

1. Criar o projeto Supabase (região próxima ao público-alvo — ex.: `sa-east-1`/São
   Paulo, para reduzir latência e por alinhamento com LGPD).
2. Aplicar as migrations em ordem, usando o SQL Editor do Supabase ou a CLI oficial:
   ```
   supabase/migrations/0001_extensions_and_enums.sql
   ... (em ordem numérica até)
   supabase/migrations/0010_deadline_notified_flag.sql
   ```
   **Não** rode `supabase/local-dev/bootstrap_local_auth_stub.sql` nem
   `bootstrap_local_storage_stub.sql` contra o projeto real — esses arquivos existem
   apenas para simular `auth`/`storage` num Postgres puro de desenvolvimento (ver
   `supabase/local-dev/README.md`). Um projeto Supabase real já tem esses schemas.
3. Confirmar que os buckets de Storage foram criados pela migration `0009_storage.sql`
   (bucket `documents`, privado).
4. Anotar: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` (em Project Settings > API).

## 3. Criar o primeiro usuário administrador

O fluxo normal de convite (`createInvite`) só cria clientes (`role: 'client'`). Para o
primeiro `admin`, crie manualmente uma vez:

1. Crie o usuário em Supabase Auth (Dashboard > Authentication > Add user, ou
   `supabase.auth.admin.createUser`).
2. Insira a linha correspondente em `public.profiles` com `role = 'admin'`,
   `is_active = true`.
3. A partir daí, esse admin pode logar em `/entrar` e usar `/admin/usuarios` e
   `/admin/permissoes` para gerenciar o restante da equipe.

## 4. Configurar o Notion

1. Criar uma integração interna em https://www.notion.so/my-integrations e copiar o
   token (`NOTION_TOKEN`).
2. Compartilhar cada database (Clientes, Processos, Andamentos, etc.) com essa
   integração.
3. Copiar o ID de cada database para `NOTION_DB_CLIENTES_ID`, `NOTION_DB_PROCESSOS_ID`
   etc.
4. Confirmar que cada database tem os campos exatos esperados pela allowlist —
   ver `src/modules/notion-sync/allowed-fields.ts` — incluindo os campos de portão de
   publicação (`Portal ativo`, `Publicar no portal`, `Revisado por advogado`).

## 5. Variáveis de ambiente

Copie `.env.example` para a configuração de ambiente da Vercel (Project Settings >
Environment Variables) e preencha cada uma com o valor real — nunca reutilize valores
de exemplo. Ver `VARIAVEIS-DE-AMBIENTE.md` para o significado de cada variável e seu
nível de sensibilidade. No mínimo, para o app funcionar com todas as integrações
reais (não mock):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NOTION_TOKEN`, `NOTION_DB_*_ID`
- `ANTHROPIC_API_KEY`
- `N8N_WEBHOOK_SECRET`, `N8N_BASE_URL`, `N8N_TRIGGER_TOKEN` (se for usar as
  automações da Fase 11)
- `ACTIVATION_CODE_PEPPER` (gerar um valor aleatório único — nunca usar o padrão de
  desenvolvimento `dev-only-insecure-pepper` em produção)
- `NEXT_PUBLIC_OFFICE_*` (nome, telefone, e-mail, endereço do escritório)

Sem uma variável opcional (Notion/Claude/n8n), o app funciona normalmente usando os
adaptadores mock — mas nenhuma dessas deve ficar ausente em produção real.

## 6. Deploy na Vercel

1. Importar o repositório na Vercel (framework detectado automaticamente como
   Next.js — `vercel.json` só reforça `framework: nextjs` e a região).
2. Configurar as variáveis de ambiente (passo 5) no projeto Vercel, separadamente
   para Preview/Production se forem apontar para projetos Supabase diferentes.
3. Deploy. O pipeline de CI (`.github/workflows/ci.yml`) já roda lint, typecheck,
   testes unitários, a suíte de isolamento de RLS e os testes E2E a cada push/PR —
   confirme que está verde antes de promover para produção.

## 7. Configurar o n8n

1. Importar os 12 workflows de `automations/n8n/*.json` numa instância n8n.
2. Configurar as variáveis de ambiente do n8n (não do Next.js): `APP_BASE_URL`,
   `N8N_WEBHOOK_SECRET`, `N8N_TRIGGER_TOKEN`, `SMTP_FROM`, `OFFICE_STAFF_EMAIL`, e uma
   credencial SMTP no nó "Enviar e-mail" — ver `automations/n8n/README.md`.
3. Ativar cada workflow.

## 8. Verificação pós-deploy

Seguir o checklist de `CHECKLIST-DE-PRODUCAO.md` antes de anunciar o portal aos
clientes — em especial a seção "Testes finais antes do go-live", que inclui rodar
`npm run test:e2e` contra o ambiente de staging recém-criado e o fluxo manual completo
(convite → ativação → login → visualizar processo).
