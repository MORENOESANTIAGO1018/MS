import "server-only";
import { logger } from "@/lib/logger";

export interface AntivirusScanResult {
  clean: boolean;
  engine: string;
  scannedAt: string;
}

/**
 * Fluxo preparado para analise antivirus (Fase 9). Nenhum servico de
 * antivirus real esta contratado/configurado neste ambiente — este
 * adaptador documenta o contrato esperado e mantem o upload funcional via um
 * resultado simulado sempre "limpo", registrando isso claramente no log.
 *
 * Para produção: substituir por integração real (ex.: ClamAV via fila,
 * VirusTotal API, ou scanner do proprio provedor de storage) mantendo a
 * mesma assinatura de função, e bloquear o upload (rota
 * app/api/documents/upload) quando `clean = false`.
 */
export async function scanDocumentBuffer(
  _buffer: ArrayBuffer,
  fileName: string,
): Promise<AntivirusScanResult> {
  logger.warn("Antivirus real nao configurado — usando resultado simulado (mock)", {
    fileName,
  });

  return {
    clean: true,
    engine: "mock-antivirus",
    scannedAt: new Date().toISOString(),
  };
}
