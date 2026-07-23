export interface ClaudeSummaryInput {
  originalText: string;
  processNumber: string;
  practiceArea: string | null;
}

export interface ClaudeSummaryOutput {
  technicalSummary: string;
  plainLanguageSummary: string;
  classification: string;
  possibleDeadline: string | null;
  suggestedProvidence: string | null;
  sensitiveFlags: string[];
  model: string;
  modelVersion: string;
  promptVersion: string;
}

export interface ClaudeAdapter {
  summarizeProcessUpdate(input: ClaudeSummaryInput): Promise<ClaudeSummaryOutput>;
}
