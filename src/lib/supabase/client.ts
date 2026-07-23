"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Cliente Supabase para uso em Client Components.
 * Usa apenas a anon key (protegida por RLS) — nunca a service role key.
 */
export function createSupabaseBrowserClient() {
  const env = getPublicEnv();
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
