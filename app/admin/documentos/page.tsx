import type { Metadata } from "next";
import { listAllDocuments, listAllClients } from "@/modules/admin/queries";
import { DocumentReviewForm } from "@/modules/admin/components/DocumentReviewForm";
import { DownloadDocumentButton } from "@/modules/documents/components/DownloadDocumentButton";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Documentos" };

export default async function AdminDocumentosPage() {
  const [documents, clients] = await Promise.all([listAllDocuments(), listAllClients()]);
  const clientNameById = new Map(clients.map((c) => [c.id, c.full_name]));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-serif font-semibold text-brand-navy">Documentos</h1>

      <div className="space-y-3">
        {documents.map((doc) => (
          <Card key={doc.id}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-slate-900">{doc.name}</p>
                <p className="text-sm text-slate-500">
                  {clientNameById.get(doc.client_id)} · {doc.category ?? "Sem categoria"} ·{" "}
                  {formatDate(doc.created_at)}
                </p>
                {doc.is_confidential && <Badge tone="danger">Sigiloso</Badge>}
                {doc.uploaded_by_role === "client" && (
                  <Badge tone="info" className="ml-1">
                    Enviado pelo cliente
                  </Badge>
                )}
              </div>
              <DownloadDocumentButton documentId={doc.id} />
            </div>
            <div className="mt-2">
              <DocumentReviewForm
                documentId={doc.id}
                isVisibleToClient={doc.is_visible_to_client}
                reviewed={doc.reviewed}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
