"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getSupabaseAdminClient,
  adminRevokeAllSessions,
} from "@/lib/server/supabase-admin";
import { checkRateLimit, resetRateLimit } from "@/lib/server/rate-limit";
import { recordAccessLog } from "@/lib/server/access-log";
import { recordAuditLog } from "@/lib/server/audit-log";
import { notifyN8n } from "@/lib/server/n8n-notify";
import {
  generateActivationCode,
  hashActivationCode,
  activationCodeExpiresAt,
} from "@/lib/server/activation-code";
import { logger } from "@/lib/logger";
import {
  activationSchema,
  blockUserSchema,
  createInviteSchema,
  loginSchema,
  requestPasswordResetSchema,
  resendActivationCodeSchema,
  revokeSessionsSchema,
} from "./schema";
import type { AuthActionResult, CreateInviteResult } from "./types";

async function getRequestMeta() {
  const headerList = await headers();
  return {
    ip: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headerList.get("user-agent"),
  };
}

// Mensagem generica para nao revelar se um e-mail existe ou nao no sistema
// (regra de protecao contra enumeracao de usuarios — Fase 13).
const GENERIC_AUTH_ERROR =
  "Não foi possível entrar. Verifique o e-mail e a senha informados.";
const GENERIC_RESET_MESSAGE =
  "Se o e-mail informado estiver cadastrado, você receberá instruções em instantes.";
const RATE_LIMITED_MESSAGE =
  "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.";

export async function login(formData: FormData): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, message: "Preencha e-mail e senha corretamente." };
  }

  const { email, password } = parsed.data;
  const { ip, userAgent } = await getRequestMeta();
  const rateLimitKey = `login:${email.toLowerCase()}`;

  const rateLimit = await checkRateLimit(rateLimitKey);
  if (!rateLimit.allowed) {
    await recordAccessLog({
      profileId: null,
      action: "login_rate_limited",
      resourceType: "auth",
      ip,
      userAgent,
    });
    return { success: false, message: RATE_LIMITED_MESSAGE };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    await recordAccessLog({
      profileId: null,
      action: "login_failed",
      resourceType: "auth",
      ip,
      userAgent,
    });
    return { success: false, message: GENERIC_AUTH_ERROR };
  }

  const admin = getSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, is_active, blocked_reason")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    await recordAccessLog({
      profileId: data.user.id,
      action: "login_blocked",
      resourceType: "auth",
      ip,
      userAgent,
    });
    return {
      success: false,
      message: "Este acesso está bloqueado. Entre em contato com o escritório.",
    };
  }

  await resetRateLimit(rateLimitKey);
  await admin
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", data.user.id);
  await recordAccessLog({
    profileId: data.user.id,
    action: "login_success",
    resourceType: "auth",
    ip,
    userAgent,
  });

  return { success: true, message: "Login realizado com sucesso." };
}

export async function logout(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.auth.signOut();

  if (user) {
    await recordAccessLog({
      profileId: user.id,
      action: "logout",
      resourceType: "auth",
    });
  }

  redirect("/entrar");
}

export async function requestPasswordReset(
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = requestPasswordResetSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    // Mesma mensagem generica mesmo em caso de e-mail invalido, para nao
    // dar pistas sobre o que existe ou nao na base.
    return { success: true, message: GENERIC_RESET_MESSAGE };
  }

  const { email } = parsed.data;
  const rateLimitKey = `password-reset:${email.toLowerCase()}`;
  const rateLimit = await checkRateLimit(rateLimitKey);
  if (!rateLimit.allowed) {
    return { success: false, message: RATE_LIMITED_MESSAGE };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    logger.error("Falha ao solicitar recuperacao de senha", { error: error.message });
  }

  // Sempre retorna sucesso genérico — nunca revela se o e-mail existe.
  return { success: true, message: GENERIC_RESET_MESSAGE };
}

/**
 * Cria um convite para um cliente acessar o portal (regra: cadastro somente
 * por convite). Requer que o chamador ja tenha sido autorizado como
 * staff/admin pela camada de UI/rota (middleware + verificacao de papel) —
 * a policy de RLS de client_access/profiles tambem impede um cliente comum
 * de chamar isto com efeito, mas a checagem explicita abaixo e uma segunda
 * barreira.
 */
export async function createInvite(formData: FormData): Promise<CreateInviteResult> {
  const parsed = createInviteSchema.safeParse({
    clientId: formData.get("clientId"),
    email: formData.get("email"),
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) {
    return { success: false, message: "Dados de convite inválidos." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: actingUser },
  } = await supabase.auth.getUser();

  if (!actingUser) {
    return { success: false, message: "Sessão expirada. Faça login novamente." };
  }

  const admin = getSupabaseAdminClient();
  const { data: actingProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", actingUser.id)
    .maybeSingle();

  if (!actingProfile || actingProfile.role === "client") {
    return { success: false, message: "Você não tem permissão para criar convites." };
  }

  const { clientId, email, fullName } = parsed.data;

  const { data: createdUser, error: createUserError } =
    await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      // Senha aleatoria e inutilizavel: o cliente so define a propria senha
      // no fluxo de ativacao (activateAccount), nunca recebe esta.
      password: crypto.randomUUID() + crypto.randomUUID(),
    });

  if (createUserError || !createdUser.user) {
    logger.error("Falha ao criar usuario para convite", {
      error: createUserError?.message,
    });
    return { success: false, message: "Não foi possível criar o convite." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: createdUser.user.id,
    role: "client",
    full_name: fullName,
    email,
    is_active: true,
  });

  if (profileError) {
    logger.error("Falha ao criar profile para convite", { error: profileError.message });
    return { success: false, message: "Não foi possível criar o convite." };
  }

  const code = generateActivationCode();
  const codeHash = hashActivationCode(code);

  const { data: accessRow, error: accessError } = await admin
    .from("client_access")
    .insert({
      profile_id: createdUser.user.id,
      client_id: clientId,
      access_level: "owner",
      is_active: true,
      invited_by: actingUser.id,
      activation_code_hash: codeHash,
      activation_code_expires_at: activationCodeExpiresAt().toISOString(),
    })
    .select("id")
    .single();

  if (accessError || !accessRow) {
    logger.error("Falha ao criar client_access para convite", {
      error: accessError?.message,
    });
    return { success: false, message: "Não foi possível criar o convite." };
  }

  await recordAuditLog({
    actorProfileId: actingUser.id,
    action: "create_invite",
    entityType: "client_access",
    entityId: accessRow.id,
    after: { clientId, email, fullName },
  });

  // O codigo em claro (`code`) e enviado uma unica vez ao workflow n8n
  // "02-criacao-de-convite" (automations/n8n/02-criacao-de-convite.json),
  // que o entrega ao cliente por e-mail. Nunca e persistido em texto claro
  // no Supabase — so o hash (activation_code_hash) fica gravado.
  await notifyN8n("convite-criado", {
    clientAccessId: accessRow.id,
    clientId,
    email,
    fullName,
    code,
  });

  return {
    success: true,
    message: `Convite criado. Código de ativação: ${code}`,
    clientAccessId: accessRow.id,
  };
}

export async function resendActivationCode(
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = resendActivationCodeSchema.safeParse({
    clientAccessId: formData.get("clientAccessId"),
  });

  if (!parsed.success) {
    return { success: false, message: "Convite inválido." };
  }

  const admin = getSupabaseAdminClient();
  const code = generateActivationCode();
  const codeHash = hashActivationCode(code);

  const { data: accessRow } = await admin
    .from("client_access")
    .select("client_id, profile_id")
    .eq("id", parsed.data.clientAccessId)
    .maybeSingle();

  const { error } = await admin
    .from("client_access")
    .update({
      activation_code_hash: codeHash,
      activation_code_expires_at: activationCodeExpiresAt().toISOString(),
      activation_used_at: null,
    })
    .eq("id", parsed.data.clientAccessId);

  if (error) {
    return { success: false, message: "Não foi possível reenviar o código." };
  }

  if (accessRow) {
    const { data: profile } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", accessRow.profile_id)
      .maybeSingle();

    // Workflow n8n "03-reenvio-codigo-ativacao".
    await notifyN8n("codigo-reenviado", {
      clientAccessId: parsed.data.clientAccessId,
      clientId: accessRow.client_id,
      email: profile?.email ?? null,
      fullName: profile?.full_name ?? null,
      code,
    });
  }

  return {
    success: true,
    message: `Novo código de ativação: ${code}`,
  };
}

/**
 * Ativa a conta do cliente: valida o codigo de ativacao (uso unico, via RPC
 * atomica consume_activation_code) e define a senha definitiva. Depois de
 * usado, o codigo perde a validade permanentemente.
 */
export async function activateAccount(formData: FormData): Promise<AuthActionResult> {
  const parsed = activationSchema.safeParse({
    clientAccessId: formData.get("clientAccessId"),
    code: formData.get("code"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Dados de ativação inválidos.",
    };
  }

  const { clientAccessId, code, password } = parsed.data;
  const rateLimitKey = `activation:${clientAccessId}`;
  const rateLimit = await checkRateLimit(rateLimitKey);
  if (!rateLimit.allowed) {
    return { success: false, message: RATE_LIMITED_MESSAGE };
  }

  const admin = getSupabaseAdminClient();
  const codeHash = hashActivationCode(code);

  const { data: consumed, error: consumeError } = await admin.rpc(
    "consume_activation_code",
    { p_client_access_id: clientAccessId, p_code_hash: codeHash },
  );

  if (consumeError || !consumed) {
    return {
      success: false,
      message: "Código de ativação inválido, expirado ou já utilizado.",
    };
  }

  const { data: accessRow, error: accessError } = await admin
    .from("client_access")
    .select("profile_id")
    .eq("id", clientAccessId)
    .single();

  if (accessError || !accessRow) {
    return { success: false, message: "Convite não encontrado." };
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(
    accessRow.profile_id,
    { password },
  );

  if (updateError) {
    logger.error("Falha ao definir senha na ativacao", { error: updateError.message });
    return { success: false, message: "Não foi possível concluir a ativação." };
  }

  await resetRateLimit(rateLimitKey);
  await recordAccessLog({
    profileId: accessRow.profile_id,
    action: "account_activated",
    resourceType: "auth",
  });

  return { success: true, message: "Conta ativada com sucesso. Você já pode entrar." };
}

/** Painel administrativo: bloqueia o acesso de um usuario (Fase 6). */
export async function blockUser(formData: FormData): Promise<AuthActionResult> {
  const parsed = blockUserSchema.safeParse({
    profileId: formData.get("profileId"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return { success: false, message: "Dados inválidos para bloqueio." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: actingUser },
  } = await supabase.auth.getUser();
  if (!actingUser) {
    return { success: false, message: "Sessão expirada." };
  }

  const admin = getSupabaseAdminClient();
  const { data: actingProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", actingUser.id)
    .maybeSingle();

  if (actingProfile?.role !== "admin") {
    return { success: false, message: "Somente administradores podem bloquear acessos." };
  }

  const { profileId, reason } = parsed.data;

  await admin
    .from("profiles")
    .update({ is_active: false, blocked_at: new Date().toISOString(), blocked_reason: reason })
    .eq("id", profileId);

  await admin
    .from("client_access")
    .update({ is_active: false, revoked_at: new Date().toISOString(), revoked_by: actingUser.id })
    .eq("profile_id", profileId);

  await adminRevokeAllSessions(profileId);

  await recordAuditLog({
    actorProfileId: actingUser.id,
    action: "block_user",
    entityType: "profiles",
    entityId: profileId,
    after: { reason },
  });

  return { success: true, message: "Acesso bloqueado com sucesso." };
}

/** Painel administrativo: revoga sessoes ativas de um usuario (Fase 6). */
export async function revokeSessions(formData: FormData): Promise<AuthActionResult> {
  const parsed = revokeSessionsSchema.safeParse({
    profileId: formData.get("profileId"),
  });

  if (!parsed.success) {
    return { success: false, message: "Usuário inválido." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: actingUser },
  } = await supabase.auth.getUser();
  if (!actingUser) {
    return { success: false, message: "Sessão expirada." };
  }

  const admin = getSupabaseAdminClient();
  const { data: actingProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", actingUser.id)
    .maybeSingle();

  if (actingProfile?.role !== "admin") {
    return { success: false, message: "Somente administradores podem revogar sessões." };
  }

  const ok = await adminRevokeAllSessions(parsed.data.profileId);

  await recordAuditLog({
    actorProfileId: actingUser.id,
    action: "revoke_sessions",
    entityType: "profiles",
    entityId: parsed.data.profileId,
  });

  return ok
    ? { success: true, message: "Sessões revogadas com sucesso." }
    : { success: false, message: "Não foi possível revogar as sessões." };
}
