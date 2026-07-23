/**
 * Redacao de dados sensiveis antes de qualquer log ou registro de auditoria.
 * Regra inegociavel #7: CPF, RG e dados bancarios nunca aparecem em logs.
 * Ver SEGURANCA-E-LGPD.md secao 3.
 */

const SENSITIVE_KEY_PATTERN =
  /^(cpf|rg|document_number|documento|password|senha|token|access_token|refresh_token|bank_account|conta_bancaria|iban|pix_key|chave_pix|receipt|comprovante|otp|activation_code|codigo_ativacao|service_role_key|api_key)$/i;

// CPF com ou sem mascara: 000.000.000-00 ou 00000000000
const CPF_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
// CNPJ com ou sem mascara
const CNPJ_PATTERN = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
// Numeros longos que se parecem com conta/cartao/agencia (8+ digitos seguidos)
const LONG_NUMBER_PATTERN = /\b\d{8,}\b/g;

const REDACTED = "[REDACTED]";

function redactString(value: string): string {
  return value
    .replace(CPF_PATTERN, REDACTED)
    .replace(CNPJ_PATTERN, REDACTED)
    .replace(LONG_NUMBER_PATTERN, REDACTED);
}

/**
 * Redige recursivamente um valor arbitrario (objeto, array, string, primitivo)
 * removendo campos sensiveis por nome e mascarando padroes de CPF/CNPJ/numeros
 * longos em qualquer string livre.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 8) return REDACTED; // evita recursao infinita em ciclos acidentais
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    return redactString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }

  if (typeof value === "object") {
    if (value instanceof Date) return value.toISOString();
    const output: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        output[key] = REDACTED;
        continue;
      }
      output[key] = redact(val, depth + 1);
    }
    return output;
  }

  return value;
}

/** Usado pelas migrations/audit_logs como referencia da mesma lista de campos. */
export const SENSITIVE_FIELD_NAMES = [
  "cpf",
  "rg",
  "document_number",
  "password",
  "token",
  "access_token",
  "refresh_token",
  "bank_account",
  "iban",
  "pix_key",
  "receipt",
  "otp",
  "activation_code",
  "service_role_key",
  "api_key",
] as const;
