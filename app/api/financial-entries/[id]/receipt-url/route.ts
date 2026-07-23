import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { getServerEnv } from "@/lib/env";
import { recordAccessLog } from "@/lib/server/access-log";
import { logger } from "@/lib/logger";

/**
 * Emite uma URL assinada de curta duração para o comprovante de um
 * lançamento financeiro. Mesmo padrão de app/api/documents/[id]/signed-url:
 * primeiro confirma, com RLS no contexto do usuário, que ele pode ver este
 * lançamento; só então usa o cliente admin para assinar o caminho no
 * Storage. Nunca expõe URL pública permanente.
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

  const { data: entry } = await supabase
    .from("financial_entries")
    .select("id, client_id, receipt_storage_path")
    .eq("id", id)
    .maybeSingle();

  if (!entry || !entry.receipt_storage_path) {
    return NextResponse.json({ error: "Comprovante não encontrado." }, { status: 404 });
  }

  const admin = getSupabaseAdminClient();
  const env = getServerEnv();
  const { data: signed, error } = await admin.storage
    .from("documents")
    .createSignedUrl(entry.receipt_storage_path, env.DOCUMENT_SIGNED_URL_TTL_SECONDS);

  if (error || !signed) {
    logger.error("Falha ao gerar URL assinada de comprovante", {
      error: error?.message,
      financialEntryId: id,
    });
    return NextResponse.json(
      { error: "Não foi possível gerar o link de download." },
      { status: 500 },
    );
  }

  await recordAccessLog({
    profileId: user.id,
    clientId: entry.client_id,
    action: "receipt_downloaded",
    resourceType: "financial_entries",
    resourceId: entry.id,
  });

  return NextResponse.json({ url: signed.signedUrl });
}
