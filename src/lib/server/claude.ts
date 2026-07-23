import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { getServerEnv, hasCredential } from "@/lib/env";
import { logger } from "@/lib/logger";
import { MockClaudeAdapter } from "./claude.mock";
import { claudeSummaryOutputSchema } from "./claude.schema";
import type { ClaudeAdapter, ClaudeSummaryInput, ClaudeSummaryOutput } from "./claude.types";

const PROMPT_VERSION = "v1";

const SYSTEM_PROMPT = `Você é um assistente jurídico que resume andamentos processuais
para uso interno de um escritório de advocacia brasileiro.

Regras obrigatórias:
- NUNCA afirme o resultado final de um processo ou dê garantias sobre desfecho.
- NUNCA invente prazos, datas ou fatos que não estejam explicitamente no texto.
- Se o texto mencionar dados pessoais sensíveis desnecessários (saúde, dados
  bancários completos, dados de terceiros), sinalize em "sensitiveFlags" em vez de
  repeti-los no resumo.
- "plainLanguageSummary" deve ser compreensível por uma pessoa leiga, sem jargão.
- "technicalSummary" é para uso interno da equipe jurídica.
- Responda APENAS com um JSON válido no formato solicitado, sem texto adicional.`;

function buildUserPrompt(input: ClaudeSummaryInput): string {
  return JSON.stringify({
    instrucao:
      "Analise o andamento processual abaixo e produza a saída estruturada solicitada.",
    numero_processo: input.processNumber,
    area_juridica: input.practiceArea,
    texto_original: input.originalText,
    formato_esperado: {
      technicalSummary: "string",
      plainLanguageSummary: "string",
      classification:
        "uma de: Decisão, Despacho, Sentença, Publicação, Intimação, Citação, Certidão, Outro",
      possibleDeadline: "YYYY-MM-DD ou null",
      suggestedProvidence: "string ou null",
      sensitiveFlags: "string[]",
    },
  });
}

class RealClaudeAdapter implements ClaudeAdapter {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async summarizeProcessUpdate(
    input: ClaudeSummaryInput,
  ): Promise<ClaudeSummaryOutput> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(input) }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Resposta da Claude API sem conteudo de texto");
    }

    let rawJson: unknown;
    try {
      rawJson = JSON.parse(textBlock.text);
    } catch (error) {
      logger.error("Falha ao parsear JSON da Claude API", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error("A IA retornou um formato invalido. Revisao manual necessaria.");
    }

    const parsed = claudeSummaryOutputSchema.safeParse(rawJson);
    if (!parsed.success) {
      logger.error("Saida da Claude API nao passou na validacao Zod", {
        issues: parsed.error.issues,
      });
      throw new Error(
        "A saida estruturada da IA nao passou na validacao. Revisao manual necessaria.",
      );
    }

    return {
      ...parsed.data,
      model: "claude",
      modelVersion: this.model,
      promptVersion: PROMPT_VERSION,
    };
  }
}

let cachedAdapter: ClaudeAdapter | null = null;

/**
 * Retorna o adaptador da Claude API: real se ANTHROPIC_API_KEY estiver
 * configurada, caso contrario um mock. A IA nunca publica sozinha — ver
 * src/modules/ai-summaries/actions.ts (approveAiSummary exige revisor humano).
 */
export function getClaudeAdapter(): ClaudeAdapter {
  if (cachedAdapter) return cachedAdapter;

  if (!hasCredential("claude")) {
    logger.warn("ANTHROPIC_API_KEY ausente — usando MockClaudeAdapter");
    cachedAdapter = new MockClaudeAdapter();
    return cachedAdapter;
  }

  const env = getServerEnv();
  cachedAdapter = new RealClaudeAdapter(env.ANTHROPIC_API_KEY as string, env.ANTHROPIC_MODEL);
  return cachedAdapter;
}
