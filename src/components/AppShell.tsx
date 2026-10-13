import { Link } from "@tanstack/react-router";
import { Bell, Clock, Home, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";

const itens = [
  { to: "/", label: "Início", icon: Home },
  { to: "/registrar", label: "Registrar", icon: Clock },
  { to: "/alunos", label: "Alunos", icon: Users },
  { to: "/alertas", label: "Alertas", icon: Bell },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { alertas } = useStore();
  const pend = alertas.filter((a) => a.status === "pendente").length;
  return (
    <div className="min-h-screen md:flex">
      <aside className="no-print hidden md:flex md:w-64 md:flex-col bg-navy text-navy-foreground p-5 gap-2 sticky top-0 h-screen">
        <div className="text-2xl font-extrabold mb-6">Pontual<span className="text-justified">+</span></div>
        {itens.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} activeOptions={{ exact: to === "/" }}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold opacity-80 hover:opacity-100 hover:bg-primary/40"
            activeProps={{ className: "bg-primary opacity-100" }}>
            <Icon className="size-5" /> {label}
            {to === "/alertas" && pend > 0 && <span className="ml-auto rounded-full bg-late px-2 text-sm">{pend}</span>}
          </Link>
        ))}
        <p className="mt-auto text-xs opacity-60">Versão de demonstração · dados fictícios</p>
      </aside>
      <main className="flex-1 pb-24 md:pb-8">{children}</main>
      <nav className="no-print md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        {itens.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} activeOptions={{ exact: to === "/" }}
            className="relative flex flex-col items-center gap-1 py-3 text-xs font-semibold text-muted-foreground"
            activeProps={{ className: "text-primary" }}>
            <Icon className="size-6" /> {label}
            {to === "/alertas" && pend > 0 && <span className="absolute top-1.5 right-1/4 rounded-full bg-late text-primary-foreground px-1.5 text-[10px]">{pend}</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="bg-hero text-navy-foreground px-5 pt-8 pb-10 md:rounded-b-3xl">
      <div className="mx-auto max-w-5xl">
        <div className="md:hidden text-sm font-bold opacity-80 mb-2">Pontual<span className="text-justified">+</span></div>
        <h1 className="text-2xl md:text-3xl font-extrabold">{title}</h1>
        {subtitle && <p className="mt-1 opacity-80">{subtitle}</p>}
        {children}
      </div>
    </header>
  );
}

export function Status({ tipo }: { tipo: "late" | "justified" | "ok" }) {
  const m = {
    late: ["bg-late-soft text-late", "Sem justificativa"],
    justified: ["bg-justified-soft text-justified", "Justificado"],
    ok: ["bg-ok-soft text-ok", "Situação regular"],
  }[tipo];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${m[0]}`}>
      <span className="size-2 rounded-full bg-current" /> {m[1]}
    </span>
  );
}
