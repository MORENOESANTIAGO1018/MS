import Link from "next/link";

const NAV_ITEMS = [
  { href: "/painel", label: "Painel" },
  { href: "/processos", label: "Meus processos" },
  { href: "/andamentos", label: "Andamentos" },
  { href: "/audiencias", label: "Audiências" },
  { href: "/prazos", label: "Prazos" },
  { href: "/documentos", label: "Documentos" },
  { href: "/contratos", label: "Contratos" },
  { href: "/financeiro", label: "Financeiro" },
  { href: "/mensagens", label: "Mensagens" },
  { href: "/notificacoes", label: "Notificações" },
  { href: "/meus-dados", label: "Meus dados" },
  { href: "/suporte", label: "Suporte" },
];

export function PortalNav() {
  return (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-surface-muted hover:text-brand-navy"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
