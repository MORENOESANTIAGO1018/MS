import { clsx } from "clsx";
import type { TableHTMLAttributes } from "react";

/**
 * Envolve a tabela em um container com scroll horizontal proprio, para que
 * ela nunca force a pagina inteira a rolar lateralmente em telas estreitas.
 */
export function Table({ className, children, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={clsx("w-full text-left text-sm", className)} {...props}>
        {children}
      </table>
    </div>
  );
}
