import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Portal do Cliente | Moreno & Santiago Advogados",
    template: "%s | Portal do Cliente",
  },
  description:
    "Acompanhe seus processos, audiências, documentos e situação financeira com segurança.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
