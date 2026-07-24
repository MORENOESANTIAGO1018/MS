import { test, expect } from "@playwright/test";

/**
 * Confere que os cabecalhos de seguranca de next.config.mjs realmente
 * chegam nas respostas HTTP — nao apenas que estao configurados no arquivo
 * (ver SECURITY-REPORT.md, Fase 13).
 */
test.describe("Cabeçalhos de segurança", () => {
  test("resposta da home inclui os cabeçalhos esperados", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    const headers = response!.headers();

    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    // connect-src deve ser só 'self' — ver Fase 13 (achado corrigido).
    expect(headers["content-security-policy"]).toContain("connect-src 'self'");
  });

  test("não expõe o cabeçalho X-Powered-By", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response!.headers();
    expect(headers["x-powered-by"]).toBeUndefined();
  });
});
