/**
 * Allowlist explicita de campos sincronizados do Notion para o Supabase
 * (Fase 7, regra inegociavel: "somente sincronize registros marcados como
 * Publicar no portal / Visivel no portal / Aprovado para publicacao" e
 * "crie uma lista explicita de campos permitidos").
 *
 * Os mappers em src/lib/server/notion.ts (mapRawClientPage,
 * mapRawProcessPage, mapRawProcessUpdatePage) sao a implementacao real desta
 * allowlist: eles so extraem, propriedade a propriedade, exatamente os
 * campos listados aqui. Este arquivo existe para tornar essa decisao
 * auditável e testável isoladamente (ver tests/unit/notion-allowed-fields.test.ts).
 */

export const ALLOWED_NOTION_FIELDS = {
  clients: [
    "Nome completo",
    "E-mail",
    "Telefone",
    "Status",
    "Código interno",
    "Portal ativo",
  ],
  processes: [
    "Cliente",
    "Número do processo",
    "Tribunal",
    "Fase processual",
    "Situação",
    "Área jurídica",
    "Resumo para o cliente",
    "Publicar no portal",
  ],
  processUpdates: [
    "Processo",
    "Data do andamento",
    "Resumo em linguagem simples",
    "Classificação",
    "Possível prazo",
    "Revisado por advogado",
    "Publicar no portal",
  ],
} as const;

/**
 * Campos que NUNCA devem ser lidos ou sincronizados, mesmo que existam na
 * base do Notion (regra inegociável da Fase 7). Mantido aqui apenas como
 * documentação viva / lista de verificação em revisão de código — os
 * mappers simplesmente não fazem referência a nenhum destes nomes.
 */
export const NEVER_SYNC_FIELDS = [
  "Observações internas",
  "Resumo técnico interno",
  "Estratégia jurídica",
  "Análise de risco",
  "Divisão interna de honorários",
  "Comissões",
  "Dados de outros clientes",
  "Documentos sigilosos",
  "Minutas internas",
] as const;

export type SyncableEntity = "clients" | "processes" | "processUpdates";

export const PUBLISH_GATE_FIELD: Record<SyncableEntity, string> = {
  clients: "Portal ativo",
  processes: "Publicar no portal",
  processUpdates: "Publicar no portal",
};
