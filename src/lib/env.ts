import { z } from "zod";

/**
 * Esquema de variaveis publicas (podem chegar ao navegador).
 * Qualquer variavel aqui DEVE comecar com NEXT_PUBLIC_.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_OFFICE_NAME: z.string().default("Moreno & Santiago Advogados"),
  NEXT_PUBLIC_OFFICE_PHONE: z.string().optional().default(""),
  NEXT_PUBLIC_OFFICE_WHATSAPP: z.string().optional().default(""),
  NEXT_PUBLIC_OFFICE_EMAIL: z.string().optional().default(""),
  NEXT_PUBLIC_OFFICE_ADDRESS: z.string().optional().default(""),
  NEXT_PUBLIC_OFFICE_HOURS: z.string().optional().default(""),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

let cachedPublicEnv: PublicEnv | null = null;

/** Le e valida apenas variaveis NEXT_PUBLIC_*. Seguro para uso em Client Components. */
export function getPublicEnv(): PublicEnv {
  if (cachedPublicEnv) return cachedPublicEnv;
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_OFFICE_NAME: process.env.NEXT_PUBLIC_OFFICE_NAME,
    NEXT_PUBLIC_OFFICE_PHONE: process.env.NEXT_PUBLIC_OFFICE_PHONE,
    NEXT_PUBLIC_OFFICE_WHATSAPP: process.env.NEXT_PUBLIC_OFFICE_WHATSAPP,
    NEXT_PUBLIC_OFFICE_EMAIL: process.env.NEXT_PUBLIC_OFFICE_EMAIL,
    NEXT_PUBLIC_OFFICE_ADDRESS: process.env.NEXT_PUBLIC_OFFICE_ADDRESS,
    NEXT_PUBLIC_OFFICE_HOURS: process.env.NEXT_PUBLIC_OFFICE_HOURS,
  });
  if (!parsed.success) {
    throw new Error(
      `Variaveis de ambiente publicas invalidas: ${parsed.error.message}`,
    );
  }
  cachedPublicEnv = parsed.data;
  return cachedPublicEnv;
}

/**
 * Variaveis server-only. Este modulo so deve ser importado por codigo que roda
 * exclusivamente no servidor (Route Handlers, Server Actions, lib/server/*).
 * Nao reexportar valores brutos para o cliente.
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_DB_URL: z.string().optional(),
  NOTION_TOKEN: z.string().min(1).optional(),
  NOTION_ROOT_PAGE_ID: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-5"),
  N8N_WEBHOOK_SECRET: z.string().optional(),
  ACTIVATION_CODE_PEPPER: z.string().default("dev-only-insecure-pepper"),
  ACTIVATION_CODE_TTL_HOURS: z.coerce.number().default(72),
  SESSION_IDLE_TIMEOUT_MIN: z.coerce.number().default(30),
  AUTH_RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().default(5),
  AUTH_RATE_LIMIT_WINDOW_MIN: z.coerce.number().default(15),
  AUDIT_LOG_RETENTION_DAYS: z.coerce.number().default(180),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Variaveis de ambiente de servidor invalidas: ${parsed.error.message}`);
  }
  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

/**
 * Indica se uma integracao externa tem credencial real configurada.
 * Usado pelos adaptadores para decidir entre implementacao real e mock.
 */
export function hasCredential(name: "notion" | "claude" | "n8n"): boolean {
  const env = getServerEnv();
  switch (name) {
    case "notion":
      return Boolean(env.NOTION_TOKEN);
    case "claude":
      return Boolean(env.ANTHROPIC_API_KEY);
    case "n8n":
      return Boolean(env.N8N_WEBHOOK_SECRET);
    default:
      return false;
  }
}
