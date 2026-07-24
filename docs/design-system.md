# Design System — Portal do Cliente (Fase 12)

## Paleta

Sóbria e jurídica: azul-marinho profundo como cor primária, dourado como destaque
pontual (nunca como cor de texto principal), tons de status para financeiro/prazos.

| Token | Hex | Uso |
|---|---|---|
| `brand-navy` | `#0f1f3d` | Cor primária — cabeçalhos, botões primários, texto de marca |
| `brand-navy-light` | `#1c3363` | Hover de elementos navy |
| `brand-gold` | `#a9862f` | Fundo de botão secundário e detalhes decorativos sobre fundo escuro/claro em blocos pequenos |
| `brand-gold-light` | `#c9a75a` | Texto de marca sobre fundo navy (7.1:1) |
| `brand-gold-text` | `#876b25` | Texto de marca sobre fundo claro/branco (5.05:1 — `brand-gold` puro só alcança 3.42:1, abaixo do WCAG AA) |
| `status-success` | `#1c7d4d` | Pago, ativo, aprovado |
| `status-warning` | `#8f5e08` | A vencer, atenção (ajustado de `#b3760b`: o tom original ficava abaixo de 4.5:1 sobre branco) |
| `status-danger` | `#b3261e` | Vencido, sigiloso, rejeitado |
| `status-info` | `#1d4c8f` | Informativo neutro |

Regra: `brand-gold`/`brand-gold-light` só como **fundo** ou como texto **sobre fundo
navy**. Texto de marca sobre fundo claro sempre usa `brand-gold-text`. Todos os pares
texto/fundo abaixo foram validados para WCAG 2.1 AA (4.5:1 para texto normal, 3:1 para
texto grande ou componentes de UI):

- `brand-navy` sobre branco: 16.4:1
- `brand-gold-text` sobre branco: 5.05:1
- `brand-gold-light` sobre `brand-navy`: 7.1:1
- `brand-navy` sobre `brand-gold` (botão secundário): 4.8:1
- `status-warning` sobre branco: 5.6:1

## Tipografia

- `font-sans` (Inter): corpo de texto, formulários, navegação.
- `font-serif` (Source Serif 4): títulos (`h1`/`h2` de página, nome do escritório) — dá
  o tom "escritório de advocacia tradicional" sem parecer datado.

## Componentes (`src/components/ui/*`)

| Componente | Quando usar |
|---|---|
| `Button` | Toda ação primária/secundária/destrutiva. Variantes: `primary`, `secondary`, `ghost`, `danger`. |
| `Card` / `CardTitle` | Container padrão de bloco de conteúdo (lista, formulário, painel). |
| `Badge` | Status curto (Pago, Vencido, Sigiloso, Publicado...). |
| `Table` | Qualquer tabela — já embrulha em `overflow-x-auto` para nunca forçar scroll horizontal da página inteira em telas estreitas. |
| `EmptyState` | Substitui qualquer "Nenhum X encontrado" ad-hoc — título + descrição opcional + ação opcional. |
| `Modal` | Confirmação de ação destrutiva ou formulário curto sobreposto. Usa `<dialog>` nativo (foco preso, Esc, clique fora — de graça do navegador). |

## Acessibilidade

- Foco visível global via `:focus-visible` em `app/globals.css` (nunca remover sem
  substituto — WCAG 2.4.7).
- Contraste de cor validado nos pares acima (WCAG AA).
- `<dialog>` nativo no `Modal` garante `aria-modal`, foco preso e fechamento por Esc
  sem reimplementação manual.
- Formulários usam `<label>` associado a cada campo (via `htmlFor`/`id` ou aninhamento
  direto) em todos os componentes de `modules/*/components`.

## Responsividade

- Layout do painel administrativo (`app/admin/layout.tsx`): navegação lateral empilha
  acima do conteúdo em telas estreitas (`flex-col` até `md`, `flex-row` a partir daí).
- Tabelas sempre dentro de `Table` (scroll horizontal próprio) — nunca a página inteira
  rolando na horizontal por causa de uma tabela larga.
- Formulários de criação (`Create*Form`) usam grid responsivo
  (`grid-cols-1 sm:grid-cols-2`) para não espremer campos em telas pequenas.

## Marca institucional

Nome, telefone, WhatsApp, e-mail, endereço e horário do escritório nunca são
hardcoded — sempre lidos de `NEXT_PUBLIC_OFFICE_*` (`src/lib/env.ts`,
`getPublicEnv()`), com um valor padrão sensato em desenvolvimento. Trocar de escritório
ou atualizar contato é uma mudança de variável de ambiente no Vercel, nunca de código.
