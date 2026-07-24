import { test, expect } from "@playwright/test";

/**
 * Paginas publicas nao dependem de uma sessao Supabase real, entao rodam de
 * forma deterministica mesmo neste ambiente sem projeto Supabase de fato
 * conectado (ver NEXT_PUBLIC_SUPABASE_URL de placeholder em .env.local).
 */
test.describe("Páginas públicas", () => {
  test("home mostra o nome do escritório e link de acesso", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Acessar o portal" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Política de Privacidade" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Termos de Uso" })).toBeVisible();
  });

  test("política de privacidade carrega", async ({ page }) => {
    const response = await page.goto("/privacidade");
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("termos de uso carrega", async ({ page }) => {
    const response = await page.goto("/termos");
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("página de entrar tem os campos esperados", async ({ page }) => {
    await page.goto("/entrar");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  });
});
