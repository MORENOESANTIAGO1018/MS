import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { getServerEnv } from "@/lib/env";
import { recordAccessLog } from "@/lib/server/access-log";
import { logger } from "@/lib/logger";

/**
 * Emite uma URL assinada de curta duracao para download de um documento.
 * Nunca expomos URLs publicas permanentes (regra da Fase 9).
 *
 * Passo 1: confirma, com o cliente no contexto do usuario (RLS aplicada),
 * que o usuario realmente pode ver este documento — se a policy de SELECT
 * negar, a query simplesmente nao retorna a linha e respondemos 404.
 * Passo 2: só então usamos o cliente admin (service role) para gerar a URL
 * assinada do Storage, e registramos o acesso.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: document } = await supabase
    .from("documents")
    .select("id, client_id, storage_path, name")
    .eq("id", id)
    .maybeSingle();

  if (!document) {
    return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  }

  const admin = getSupabaseAdminClient();
  const env = getServerEnv();
  const { data: signed, error } = await admin.storage
    .from("documents")
    .createSignedUrl(document.storage_path, env.DOCUMENT_SIGNED_URL_TTL_SECONDS, {
      download: document.name,
    });

  if (error || !signed) {
    logger.error("Falha ao gerar URL assinada", { error: error?.message, documentId: id });
    return NextResponse.json(
      { error: "Não foi possível gerar o link de download." },
      { status: 500 },
    );
  }

  await recordAccessLog({
    profileId: user.id,
    clientId: document.client_id,
    action: "document_downloaded",
    resourceType: "documents",
    resourceId: document.id,
  });

  return NextResponse.json({ url: signed.signedUrl });
}
