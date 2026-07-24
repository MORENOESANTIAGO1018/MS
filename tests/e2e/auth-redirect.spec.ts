import { test, expect } from "@playwright/test";

/**
 * Sem sessao, o middleware deve redirecionar para /entrar preservando o
 * destino original — tanto para rotas do portal do cliente quanto para
 * /admin/*. Isso vale mesmo sem um projeto Supabase real conectado: uma
 * falha ao resolver o usuario e tratada como "nao autenticado" (ver
 * middleware.ts), nunca como acesso liberado por padrao.
 */
test.describe("Redirecionamento sem sessão", () => {
  test("rota do portal redireciona para /entrar com o destino original", async ({ page }) => {
    await page.goto("/painel");
    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fpainel/);
  });

  test("rota administrativa redireciona para /entrar com o destino original", async ({
    page,
  }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fadmin%2Fdashboard/);
  });

  test("rota administrativa profunda também redireciona", async ({ page }) => {
    await page.goto("/admin/clientes");
    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fadmin%2Fclientes/);
  });
});
