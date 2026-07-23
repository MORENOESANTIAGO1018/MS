import type { Metadata } from "next";
import { getPortalContext } from "@/modules/clients/current-client";
import { listDocumentsForClient } from "@/modules/documents/queries";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import { DocumentUploadForm } from "@/modules/documents/components/DocumentUploadForm";
import { DownloadDocumentButton } from "@/modules/documents/components/DownloadDocumentButton";

export const metadata: Metadata = { title: "Documentos" };

export default async function DocumentosPage() {
  const { client } = await getPortalContext();
  const documents = await listDocumentsForClient(client.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">Documentos</h1>

      <Card>
        <p className="mb-3 text-sm font-medium text-slate-700">Enviar documento</p>
        <DocumentUploadForm clientId={client.id} />
      </Card>

      {documents.length === 0 && (
        <Card>
          <p className="text-sm text-slate-500">Nenhum documento disponível.</p>
        </Card>
      )}

      {documents.map((doc) => (
        <Card key={doc.id}>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-slate-900">{doc.name}</p>
              <p className="text-sm text-slate-500">
                {doc.category ?? "Sem categoria"} · Enviado em {formatDate(doc.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {doc.uploaded_by_role === "client" && <Badge tone="info">Enviado por você</Badge>}
              <DownloadDocumentButton documentId={doc.id} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
