import { test, expect } from "@playwright/test";

/**
 * O formulario de login usa noValidate (validacao client-side desabilitada
 * de proposito — ver LoginForm.tsx), entao submeter vazio realmente chega
 * ao Server Action e exercita a validacao Zod. Credenciais invalidas
 * exercitam o caminho completo ate a chamada ao Supabase Auth — mesmo sem
 * um projeto Supabase real conectado neste ambiente, o resultado esperado
 * (mensagem generica, sem tela de erro/500) e o mesmo que em producao com
 * credenciais erradas, porque login() trata qualquer falha de
 * autenticacao (senha errada OU indisponibilidade) da mesma forma.
 *
 * Usa o seletor `p[role="alert"]` em vez de getByRole("alert") porque o
 * Next.js injeta seu proprio `#__next-route-announcer__` com o mesmo role
 * (usado para acessibilidade em navegacao client-side), o que colide com
 * getByRole em qualquer app Next.js.
 */
test.describe("Formulário de login", () => {
  test("campos vazios mostram mensagem de validação, sem crash", async ({ page }) => {
    await page.goto("/entrar");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.locator('p[role="alert"]')).toContainText("Preencha e-mail e senha corretamente");
  });

  test("credenciais inválidas mostram mensagem genérica (sem enumerar usuário)", async ({
    page,
  }) => {
    await page.goto("/entrar");
    await page.locator('input[name="email"]').fill("nao-existe@exemplo-ficticio.com");
    await page.locator('input[name="password"]').fill("senha-incorreta-123");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.locator('p[role="alert"]')).toContainText(
      "Não foi possível entrar. Verifique o e-mail e a senha informados.",
    );
    // Continua na tela de login — nenhuma pagina de erro/500 do Next.js.
    await expect(page).toHaveURL(/\/entrar/);
  });
});
