// Stub usado apenas em testes (vitest). O pacote real "server-only" lanca
// erro em qualquer ambiente que nao seja reconhecido pelo bundler do Next.js
// como "servidor", o que inclui o runtime de testes do Vitest (Node puro).
// A protecao real contra vazamento para o navegador e feita em producao pelo
// build do Next.js e, de forma independente, pelo scripts/check-server-only-imports.ts
// (rodado em CI) e pela regra de ESLint no-restricted-imports.
export {};
