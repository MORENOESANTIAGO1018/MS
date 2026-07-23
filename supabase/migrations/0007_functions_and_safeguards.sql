-- 0007_functions_and_safeguards.sql
-- Funcoes de suporte: redacao de auditoria e consumo atomico de codigo de
-- ativacao de uso unico (regra da FASE 4: "depois da ativacao, perde a
-- validade").

-- ---------------------------------------------------------------------------
-- Redacao de campos sensiveis em jsonb — espelha a lista de
-- src/lib/redact.ts (SENSITIVE_FIELD_NAMES). Aplicada a audit_logs.before/after
-- como defesa em profundidade, mesmo que o codigo de aplicacao falhe em
-- redigir antes de enviar.
-- ---------------------------------------------------------------------------
create or replace function public.redact_sensitive_jsonb(data jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  sensitive_keys text[] := array[
    'cpf', 'rg', 'document_number', 'document_number_encrypted', 'password',
    'token', 'access_token', 'refresh_token', 'bank_account', 'iban',
    'pix_key', 'receipt', 'receipt_storage_path', 'otp', 'activation_code',
    'activation_code_hash', 'service_role_key', 'api_key'
  ];
  result jsonb;
  key text;
begin
  if data is null then
    return null;
  end if;

  result := data;
  foreach key in array sensitive_keys loop
    if result ? key then
      result := jsonb_set(result, array[key], '"[REDACTED]"'::jsonb);
    end if;
  end loop;

  return result;
end;
$$;

create or replace function public.redact_audit_log_before_insert()
returns trigger
language plpgsql
as $$
begin
  new.before = public.redact_sensitive_jsonb(new.before);
  new.after = public.redact_sensitive_jsonb(new.after);
  return new;
end;
$$;

drop trigger if exists trg_redact_audit_log on public.audit_logs;
create trigger trg_redact_audit_log
  before insert on public.audit_logs
  for each row execute function public.redact_audit_log_before_insert();

-- ---------------------------------------------------------------------------
-- Consumo atomico do codigo de ativacao. O hash e calculado na aplicacao
-- (Node, com pepper de ACTIVATION_CODE_PEPPER) — esta funcao apenas garante
-- atomicidade (evita corrida entre duas tentativas simultaneas de uso do
-- mesmo codigo) e centraliza a checagem de expiracao/uso unico.
-- ---------------------------------------------------------------------------
create or replace function public.consume_activation_code(
  p_client_access_id uuid,
  p_code_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.client_access
  set activation_used_at = now()
  where id = p_client_access_id
    and activation_code_hash = p_code_hash
    and activation_used_at is null
    and activation_code_expires_at is not null
    and activation_code_expires_at > now()
    and is_active = true;

  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

comment on function public.consume_activation_code(uuid, text) is
  'Marca o codigo de ativacao como usado de forma atomica. Retorna false se o codigo ja foi usado, expirou ou nao confere — nesses casos a ativacao deve ser rejeitada pela aplicacao.';
