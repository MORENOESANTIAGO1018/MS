import { afterEach, describe, expect, it, vi } from "vitest";
import { notifyN8n } from "@/lib/server/n8n-notify";
import { isValidWebhookSecret } from "@/lib/server/webhook-auth";

describe("notifyN8n", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.N8N_BASE_URL;
    delete process.env.N8N_TRIGGER_TOKEN;
  });

  it("nao faz chamada de rede quando N8N_BASE_URL/N8N_TRIGGER_TOKEN nao estao configurados (mock)", async () => {
    delete process.env.N8N_BASE_URL;
    delete process.env.N8N_TRIGGER_TOKEN;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await notifyN8n("evento-teste", { foo: "bar" });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("isValidWebhookSecret", () => {
  it("rejeita quando o segredo esperado nao esta configurado", () => {
    expect(isValidWebhookSecret("qualquer-coisa", undefined)).toBe(false);
  });

  it("rejeita quando nada foi enviado", () => {
    expect(isValidWebhookSecret(null, "segredo-configurado")).toBe(false);
  });

  it("rejeita segredo incorreto", () => {
    expect(isValidWebhookSecret("errado", "correto123")).toBe(false);
  });

  it("aceita segredo correto", () => {
    expect(isValidWebhookSecret("correto123", "correto123")).toBe(true);
  });
});
