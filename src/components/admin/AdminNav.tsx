import Link from "next/link";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/processos", label: "Processos" },
  { href: "/admin/andamentos", label: "Andamentos" },
  { href: "/admin/audiencias", label: "Audiências" },
  { href: "/admin/prazos", label: "Prazos" },
  { href: "/admin/contratos", label: "Contratos" },
  { href: "/admin/financeiro", label: "Financeiro" },
  { href: "/admin/documentos", label: "Documentos" },
  { href: "/admin/mensagens", label: "Mensagens" },
  { href: "/admin/usuarios", label: "Usuários" },
  { href: "/admin/permissoes", label: "Permissões" },
  { href: "/admin/relatorios", label: "Relatórios" },
  { href: "/admin/logs", label: "Logs" },
  { href: "/admin/configuracoes", label: "Configurações" },
  { href: "/admin/sincronizacao", label: "Sincronização" },
  { href: "/admin/resumos-ia", label: "Resumos por IA" },
];

export function AdminNav() {
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
