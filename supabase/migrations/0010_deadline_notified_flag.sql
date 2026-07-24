-- 0010_deadline_notified_flag.sql
-- Adiciona a public.deadlines o mesmo mecanismo de idempotencia que
-- public.hearings ja tinha (client_notified): permite que o job de lembrete
-- de prazos (Fase 11, /api/notifications/deadline-reminder) marque um prazo
-- como notificado e nunca envie a mesma notificacao duas vezes, mesmo que o
-- workflow n8n rode com sobreposicao.

alter table public.deadlines
  add column if not exists client_notified boolean not null default false;

comment on column public.deadlines.client_notified is
  'Marcado true pelo job de lembrete de prazos assim que a notificacao e criada — evita duplicar notificacao em execucoes repetidas.';
