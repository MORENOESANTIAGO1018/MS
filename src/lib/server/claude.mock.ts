import "server-only";
import type { ClaudeAdapter, ClaudeSummaryInput, ClaudeSummaryOutput } from "./claude.types";

/**
 * Adaptador simulado da Claude API, usado quando ANTHROPIC_API_KEY nao esta
 * configurada. Produz uma saida estruturada plausivel e deterministica, para
 * permitir testar o fluxo completo (incluindo a fila de revisao humana) sem
 * custo/latencia de rede e sem enviar dados a um provedor externo.
 */
export class MockClaudeAdapter implements ClaudeAdapter {
  async summarizeProcessUpdate(
    input: ClaudeSummaryInput,
  ): Promise<ClaudeSummaryOutput> {
    const truncated = input.originalText.slice(0, 240);
    return {
      technicalSummary: `[MOCK] Resumo tecnico do andamento do processo ${input.processNumber}: ${truncated}`,
      plainLanguageSummary:
        "[MOCK] Este é um resumo simulado em linguagem simples para o cliente. " +
        "Configure ANTHROPIC_API_KEY para gerar resumos reais.",
      classification: "Despacho",
      possibleDeadline: null,
      suggestedProvidence: "Revisar manualmente — resposta simulada (mock).",
      sensitiveFlags: [],
      model: "mock-claude",
      modelVersion: "mock-0",
      promptVersion: "v1",
    };
  }
}
