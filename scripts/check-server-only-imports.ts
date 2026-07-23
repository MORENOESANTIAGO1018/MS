/**
 * Verificacao de seguranca (regras inegociaveis #3, #4, #5): garante que
 * nenhum modulo de src/lib/server/* seja importado por um Client Component
 * ("use client") e que nenhuma variavel sensivel (sem prefixo NEXT_PUBLIC_)
 * seja referenciada fora de src/lib/server, app/api/** ou *.actions.server.ts.
 *
 * Executado em CI via `npm run check:server-only`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..");
const SCAN_DIRS = ["app", "src"];
const SENSITIVE_ENV_VARS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "NOTION_TOKEN",
  "ANTHROPIC_API_KEY",
  "N8N_WEBHOOK_SECRET",
  "ACTIVATION_CODE_PEPPER",
];

const SERVER_ONLY_IMPORT_PATTERN = /["']@\/lib\/server\/[^"']*["']/;
const USE_CLIENT_PATTERN = /^\s*["']use client["'];?\s*$/m;
const ALLOWED_SERVER_ONLY_DIR_PATTERNS = [
  /^app[\\/]api[\\/]/,
  /^src[\\/]lib[\\/]server[\\/]/,
  /actions\.server\.ts$/,
  /^scripts[\\/]/,
  /^tests[\\/]/,
];

interface Violation {
  file: string;
  reason: string;
}

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, files);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

function isAllowedServerOnlyLocation(relativePath: string): boolean {
  return ALLOWED_SERVER_ONLY_DIR_PATTERNS.some((pattern) => pattern.test(relativePath));
}

function main(): void {
  const violations: Violation[] = [];

  for (const dir of SCAN_DIRS) {
    const dirPath = join(ROOT, dir);
    let files: string[];
    try {
      files = walk(dirPath);
    } catch {
      continue;
    }

    for (const file of files) {
      const relativePath = relative(ROOT, file);
      const content = readFileSync(file, "utf-8");

      const importsServerOnly = SERVER_ONLY_IMPORT_PATTERN.test(content);
      const isClientComponent = USE_CLIENT_PATTERN.test(content);

      if (importsServerOnly && isClientComponent) {
        violations.push({
          file: relativePath,
          reason:
            'Client Component ("use client") importando @/lib/server/* — segredo pode vazar para o navegador.',
        });
      }

      if (importsServerOnly && !isAllowedServerOnlyLocation(relativePath)) {
        violations.push({
          file: relativePath,
          reason:
            "Importa @/lib/server/* fora de app/api/**, src/lib/server/** ou *.actions.server.ts.",
        });
      }

      for (const envVar of SENSITIVE_ENV_VARS) {
        if (
          content.includes(`process.env.${envVar}`) &&
          !isAllowedServerOnlyLocation(relativePath)
        ) {
          violations.push({
            file: relativePath,
            reason: `Referencia direta a process.env.${envVar} fora de local server-only permitido.`,
          });
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error("Falha na verificacao de seguranca server-only:\n");
    for (const violation of violations) {
      console.error(`  - ${violation.file}: ${violation.reason}`);
    }
    console.error(`\nTotal: ${violations.length} violacao(oes).`);
    process.exit(1);
  }

  // eslint-disable-next-line no-console -- script de CLI, saida informativa esperada
  console.log("OK: nenhum segredo server-only vazando para o cliente.");
}

main();
