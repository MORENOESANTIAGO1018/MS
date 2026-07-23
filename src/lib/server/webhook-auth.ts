import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Compara o segredo enviado por um chamador externo (n8n) com o valor
 * configurado, em tempo constante. Usado por rotas que aceitam disparo tanto
 * de um usuario autenticado (sessao) quanto de uma automacao externa via
 * cabecalho compartilhado.
 */
export function isValidWebhookSecret(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}
