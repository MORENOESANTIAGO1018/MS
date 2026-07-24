import { describe, expect, it } from "vitest";

// WCAG 2.1 relative luminance / contrast ratio — ver docs/design-system.md.
function channel(hex: string, offset: number): number {
  const c = parseInt(hex.slice(offset + 1, offset + 3), 16) / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  return 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 2) + 0.0722 * channel(hex, 4);
}

function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

const AA_NORMAL_TEXT = 4.5;

describe("contraste de cor (WCAG AA, texto normal)", () => {
  it.each([
    ["brand-navy sobre branco", "#0f1f3d", "#ffffff"],
    ["brand-gold-text sobre branco", "#876b25", "#ffffff"],
    ["brand-gold-light sobre brand-navy", "#c9a75a", "#0f1f3d"],
    ["brand-navy sobre brand-gold (botão secundário)", "#0f1f3d", "#a9862f"],
    ["status-success sobre branco", "#1c7d4d", "#ffffff"],
    ["status-warning sobre branco", "#8f5e08", "#ffffff"],
    ["status-danger sobre branco", "#b3261e", "#ffffff"],
    ["status-info sobre branco", "#1d4c8f", "#ffffff"],
  ])("%s atinge ao menos %s:1", (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it("brand-gold puro sobre branco NAO atinge AA (por isso existe brand-gold-text)", () => {
    expect(contrastRatio("#a9862f", "#ffffff")).toBeLessThan(AA_NORMAL_TEXT);
  });
});
