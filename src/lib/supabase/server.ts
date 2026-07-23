import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Cliente Supabase para Server Components / Route Handlers / Server Actions.
 * Executa no contexto do usuario autenticado (respeita RLS via cookie de sessao).
 * NAO usa service role — para isso, ver lib/server/supabase-admin.ts.
 */
export async function createSupabaseServerClient() {
  const env = getPublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
        ) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options as CookieOptions);
            }
          } catch {
            // set() chamado a partir de um Server Component: o middleware
            // ja cuida do refresh de sessao nesse caso. Seguro ignorar.
          }
        },
      },
    },
  );
}
