# Checklist de Produção — Portal do Cliente

Marque cada item antes do go-live. Itens com **[CREDENCIAL]** exigem uma chave real
que este ambiente de desenvolvimento não possui — ver `VARIAVEIS-DE-AMBIENTE.md`.

## Infraestrutura
- [ ] Projeto Supabase de produção criado (região próxima aos usuários)
- [ ] **[CREDENCIAL]** `SUPABASE_SERVICE_ROLE_KEY` de produção gerada e guardada em
      cofre (Vercel Environment Variables, escopo *Production* apenas)
- [ ] Migrations aplicadas em produção (`supabase db push` / pipeline de CI)
- [ ] Backups automáticos do Supabase habilitados (PITR ou snapshot diário)
- [ ] Buckets de Storage criados como **privados**, políticas de acesso testadas
- [ ] Domínio próprio configurado na Vercel com HTTPS/HSTS
- [ ] Projeto Vercel separado para produção (não reaproveitar preview)

## Credenciais
- [ ] **[CREDENCIAL]** `NOTION_TOKEN` de produção (integração interna dedicada, não a
      mesma usada em testes)
- [ ] **[CREDENCIAL]** IDs das data sources do Notion de produção confirmados
- [ ] **[CREDENCIAL]** `ANTHROPIC_API_KEY` de produção com limite de gasto configurado
- [ ] **[CREDENCIAL]** `N8N_WEBHOOK_SECRET` de produção (diferente do de staging)
- [ ] Rotação documentada (dono + procedimento) para cada credencial acima

## Segurança
- [ ] `npm audit` / `pnpm audit` sem vulnerabilidades críticas/altas abertas
- [ ] CSP validada em produção sem violações no console
- [ ] Cabeçalhos de segurança confirmados via `curl -I` (HSTS, X-Frame-Options, CSP)
- [ ] Rate limiting testado sob carga básica
- [ ] RLS testada em produção com contas fictícias antes da migração de dados reais
- [ ] `SECURITY-REPORT.md` revisado e sem pendência crítica

## Dados e LGPD
- [ ] Nenhum dado real usado antes deste checklist ser concluído
- [ ] Processo de exclusão/retificação de dados do titular documentado e testado
- [ ] Política de privacidade e termos de uso revisados por jurídico do escritório
- [ ] Encarregado de dados (DPO) identificado e contato publicado nas páginas
      institucionais

## Observabilidade
- [ ] Monitoramento de erros configurado (ex.: Vercel Observability/Sentry)
- [ ] Alertas de falha de sincronização Notion configurados
- [ ] Alertas de falha de webhook n8n configurados
- [ ] Dashboard de logs de acesso/auditoria acessível ao admin

## Operação
- [ ] `docs/manual-instalacao.md`, `docs/manual-operacao.md`,
      `docs/manual-recuperacao.md` revisados por alguém que não escreveu o código
- [ ] Página de manutenção (`app/(system)/manutencao`) testada
- [ ] Página de erro genérica (`app/not-found.tsx`, `app/error.tsx`) sem vazamento de
      stack trace em produção
- [ ] Plano de rollback (revert de deploy Vercel + restauração de migration)
      documentado e testado uma vez em staging

## Testes finais antes do go-live
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run test:e2e` (contra ambiente de staging)
- [ ] `npm run build` (produção) sem erros
- [ ] `supabase/tests/rls_isolation.sql` executado em staging com sucesso
- [ ] Teste manual do fluxo completo: convite → ativação → login → visualizar
      processo publicado → mensagens → financeiro (somente leitura) → documento
      (upload/download) → logout
