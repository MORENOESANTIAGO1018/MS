import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getPublicEnv, getServerEnv } from "@/lib/env";

const PORTAL_PATH_PREFIXES = [
  "/painel",
  "/processos",
  "/andamentos",
  "/audiencias",
  "/prazos",
  "/documentos",
  "/contratos",
  "/financeiro",
  "/mensagens",
  "/notificacoes",
  "/meus-dados",
  "/suporte",
];

const ADMIN_PATH_PREFIX = "/admin";
const IDLE_COOKIE_NAME = "psc_last_activity";

function isProtectedPortalPath(pathname: string): boolean {
  return PORTAL_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isAdminPath(pathname: string): boolean {
  return pathname === ADMIN_PATH_PREFIX || pathname.startsWith(`${ADMIN_PATH_PREFIX}/`);
}

/**
 * Monta o CSP com um nonce novo a cada requisição. É necessário gerar o
 * nonce aqui (não em next.config.mjs, que só produz cabeçalhos estáticos)
 * porque o App Router injeta scripts inline de bootstrap (RSC/hidratação)
 * em toda página — sem um nonce correspondente, script-src 'self' bloqueia
 * esses scripts e a página nunca hidrata no navegador (achado da Fase 14).
 * O Next.js detecta automaticamente o nonce a partir deste cabeçalho e o
 * aplica aos seus próprios scripts inline.
 */
function buildCsp(nonce: string): string {
  const isProd = process.env.NODE_ENV === "production";
  return [
    "default-src 'self'",
    "img-src 'self' data: https://*.supabase.co",
    "connect-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProd ? "" : " 'unsafe-eval'"}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  const needsAuth = isProtectedPortalPath(pathname) || isAdminPath(pathname);
  if (!needsAuth) {
    return response;
  }

  const publicEnv = getPublicEnv();
  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          for (const { name, value } of cookiesToSet) {
            requestHeaders.set(name, value);
          }
          response = NextResponse.next({ request: { headers: requestHeaders } });
          response.headers.set("Content-Security-Policy", csp);
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options as CookieOptions);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const signInUrl = new URL("/entrar", request.url);
  signInUrl.searchParams.set("redirect", pathname);

  if (!user) {
    return NextResponse.redirect(signInUrl);
  }

  // Expiracao de sessao por inatividade (regra da Fase 4). Cada requisicao a
  // uma rota protegida atualiza o "ultimo acesso"; se o intervalo exceder
  // SESSION_IDLE_TIMEOUT_MIN, a sessao e encerrada.
  const serverEnv = getServerEnv();
  const idleTimeoutMs = serverEnv.SESSION_IDLE_TIMEOUT_MIN * 60_000;
  const lastActivityRaw = request.cookies.get(IDLE_COOKIE_NAME)?.value;
  const lastActivity = lastActivityRaw ? Number(lastActivityRaw) : null;
  const now = Date.now();

  if (lastActivity && now - lastActivity > idleTimeoutMs) {
    await supabase.auth.signOut();
    const idleUrl = new URL("/entrar", request.url);
    idleUrl.searchParams.set("reason", "idle");
    const idleResponse = NextResponse.redirect(idleUrl);
    idleResponse.cookies.delete(IDLE_COOKIE_NAME);
    return idleResponse;
  }

  response.cookies.set(IDLE_COOKIE_NAME, String(now), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  // Area administrativa: cliente comum nunca acessa, mesmo autenticado.
  if (isAdminPath(pathname)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !profile.is_active || profile.role === "client") {
      return NextResponse.redirect(new URL("/painel", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Roda em tudo, exceto assets estaticos do Next.js — a checagem fina de
     * quais paths exigem autenticacao acontece dentro da funcao (isProtectedPortalPath/isAdminPath).
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
