import { describe, expect, it } from "vitest";
import {
  generateActivationCode,
  hashActivationCode,
} from "@/lib/server/activation-code";

describe("activation-code", () => {
  it("gera codigos com o tamanho esperado e alfabeto sem caracteres ambiguos", () => {
    const code = generateActivationCode();
    expect(code).toHaveLength(8);
    expect(code).not.toMatch(/[01OI]/);
  });

  it("gera codigos diferentes a cada chamada (probabilisticamente)", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateActivationCode()));
    expect(codes.size).toBeGreaterThan(15);
  });

  it("o hash e deterministico para o mesmo codigo", () => {
    const code = "ABCD1234";
    expect(hashActivationCode(code)).toBe(hashActivationCode(code));
  });

  it("o hash e insensivel a caixa e espacos nas bordas", () => {
    expect(hashActivationCode("abcd1234")).toBe(hashActivationCode(" ABCD1234 "));
  });

  it("codigos diferentes produzem hashes diferentes", () => {
    expect(hashActivationCode("AAAAAAAA")).not.toBe(hashActivationCode("BBBBBBBB"));
  });

  it("nunca retorna o codigo em claro no hash", () => {
    const code = "SECRET42";
    expect(hashActivationCode(code)).not.toContain(code);
  });
});
