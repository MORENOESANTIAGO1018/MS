import "server-only";
import { createHmac, randomInt } from "node:crypto";
import { getServerEnv } from "@/lib/env";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I ambiguos
const CODE_LENGTH = 8;

/**
 * Gera um codigo de ativacao de uso unico (Fase 4). Nunca persistido em texto
 * claro — apenas o hash (hashActivationCode) vai para
 * client_access.activation_code_hash. O codigo em si e enviado uma unica vez
 * por e-mail/canal seguro ao cliente.
 */
export function generateActivationCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * HMAC-SHA256 do codigo com pepper server-only (ACTIVATION_CODE_PEPPER).
 * Determinístico (mesmo codigo + mesmo pepper => mesmo hash), o que permite
 * comparar via consume_activation_code() no banco sem guardar o codigo em
 * claro nem depender de bcrypt (nao ha necessidade de custo computacional
 * alto aqui — o codigo e de uso unico e expira em poucas horas).
 */
export function hashActivationCode(code: string): string {
  const env = getServerEnv();
  return createHmac("sha256", env.ACTIVATION_CODE_PEPPER)
    .update(code.trim().toUpperCase())
    .digest("hex");
}

export function activationCodeExpiresAt(): Date {
  const env = getServerEnv();
  return new Date(Date.now() + env.ACTIVATION_CODE_TTL_HOURS * 60 * 60 * 1000);
}
