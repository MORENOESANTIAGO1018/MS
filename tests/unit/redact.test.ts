import { describe, expect, it } from "vitest";
import { redact } from "@/lib/redact";

describe("redact", () => {
  it("mascara CPF com mascara", () => {
    const input = { message: "Cliente com CPF 123.456.789-01 confirmou." };
    const result = redact(input) as { message: string };
    expect(result.message).not.toContain("123.456.789-01");
    expect(result.message).toContain("[REDACTED]");
  });

  it("mascara CPF sem mascara", () => {
    const input = { message: "CPF: 12345678901" };
    const result = redact(input) as { message: string };
    expect(result.message).not.toContain("12345678901");
  });

  it("redige campos sensiveis por nome, incluindo aninhados", () => {
    const input = {
      cliente: {
        nome: "Maria Teste",
        cpf: "123.456.789-01",
        rg: "12.345.678-9",
        password: "hunter2",
      },
    };
    const result = redact(input) as {
      cliente: { nome: string; cpf: string; rg: string; password: string };
    };
    expect(result.cliente.nome).toBe("Maria Teste");
    expect(result.cliente.cpf).toBe("[REDACTED]");
    expect(result.cliente.rg).toBe("[REDACTED]");
    expect(result.cliente.password).toBe("[REDACTED]");
  });

  it("redige campos sensiveis dentro de arrays", () => {
    const input = [{ cpf: "123.456.789-01" }, { cpf: "987.654.321-00" }];
    const result = redact(input) as { cpf: string }[];
    expect(result[0]?.cpf).toBe("[REDACTED]");
    expect(result[1]?.cpf).toBe("[REDACTED]");
  });

  it("nao afeta campos nao sensiveis", () => {
    const input = { status: "Cliente ativo", area: "Família" };
    expect(redact(input)).toEqual(input);
  });

  it("mascara numeros longos que parecem dados bancarios", () => {
    const input = { message: "Conta 00012345678 recebeu deposito" };
    const result = redact(input) as { message: string };
    expect(result.message).not.toContain("00012345678");
  });

  it("lida com null e undefined sem lancar erro", () => {
    expect(redact(null)).toBeNull();
    expect(redact(undefined)).toBeUndefined();
  });
});
