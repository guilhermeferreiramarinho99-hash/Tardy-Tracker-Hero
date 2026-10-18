import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarDays, Clock, Home, LogOut, Settings, Users, Hourglass, FileSpreadsheet, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAlertas, useMe } from "@/lib/api";
import { EscolhaEscola } from "@/components/EscolhaEscola";
import { Button } from "@/components/ui/button";

export function useSair() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me, isLoading, isError, refetch } = useMe();
  const { data: alertas } = useAlertas(!!me?.isGestor);
  const sair = useSair();
  if (isLoading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Carregando…</div>;
  if (isError) return <div className="grid min-h-screen place-items-center p-6"><Button onClick={() => refetch()}>Tentar carregar sua escola novamente</Button></div>;
  if (!me) return null;
  if (!me.escola) return <EscolhaEscola sair={sair} rascunho={me.rascunho} />;

  if (me.escola.status !== "ativa") {
    const recusada = me.escola.status === "recusada";
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div className="max-w-sm space-y-4">
          <Hourglass className="mx-auto size-12 text-primary" />
          <h1 className="text-2xl font-extrabold">{recusada ? "Cadastro não aprovado" : "Aguardando verificação"}</h1>
          <p className="font-bold">{me.escola.nome}</p>
          <p className="text-muted-foreground">{recusada ? "O cadastro desta escola não foi aprovado. Entre em contato com o suporte do Pontual+." : "Recebemos o cadastro da sua escola. Assim que for verificado, você terá acesso como administrador."}</p>
          <button onClick={sair} className="rounded-xl border bg-card px-5 py-3 font-bold">Sair</button>
        </div>
      </div>
    );
  }

  if (me.roles.length === 0) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div className="max-w-sm space-y-4">
          <Hourglass className="mx-auto size-12 text-primary" />
          <h1 className="text-2xl font-extrabold">Aguardando liberação</h1>
          <p className="font-bold">{me.escola.nome}</p>
          <p className="text-muted-foreground">Sua conta foi criada, mas ainda não tem um perfil de acesso. Peça à administração da escola para liberar seu acesso.</p>
          <button onClick={sair} className="rounded-xl border bg-card px-5 py-3 font-bold">Sair</button>
        </div>
      </div>
    );
  }

  const pend = (alertas ?? []).filter((a) => a.status === "pendente").length;
  const itens = [
    me.isStaff && { to: "/inicio", label: "Início", icon: Home },
    me.isStaff && { to: "/registrar", label: "Registrar", icon: Clock },
    me.isStaff && { to: "/alunos", label: "Alunos", icon: Users },
    me.isGestor && { to: "/alertas", label: "Alertas", icon: Bell, badge: pend },
    me.isStaff && { to: "/relatorios", label: "Relatórios", icon: FileSpreadsheet },
    me.isAdmin && { to: "/admin", label: "Admin", icon: Settings },
    me.ehSuperadmin && { to: "/verificacao", label: "Verificação", icon: ShieldCheck },
    me.isAluno && !me.isStaff && { to: "/meu-historico", label: "Meu histórico", icon: CalendarDays },
  ].filter(Boolean) as { to: "/inicio"; label: string; icon: typeof Home; badge?: number }[];

  return (
    <div className="min-h-screen md:flex">
      <aside className="no-print sticky top-0 hidden h-screen flex-col gap-2 bg-navy p-5 text-navy-foreground md:flex md:w-64">
        <div className="mb-6 text-2xl font-extrabold">Pontual<span className="text-justified">+</span></div>
        <div className="mb-4 break-words font-semibold">{me.escola.nome}</div>
        {itens.map(({ to, label, icon: Icon, badge }) => (
          <Link key={to} to={to} className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold opacity-80 hover:bg-primary/40 hover:opacity-100"
            activeProps={{ className: "bg-primary opacity-100" }}>
            <Icon className="size-5" /> {label}
            {!!badge && <span className="ml-auto rounded-full bg-late px-2 text-sm">{badge}</span>}
          </Link>
        ))}
        <div className="mt-auto space-y-2 text-sm">
          <div className="opacity-70">{me.nome}</div>
          <button onClick={sair} className="flex items-center gap-2 font-semibold opacity-80 hover:opacity-100"><LogOut className="size-4" /> Sair</button>
        </div>
      </aside>
      <main className="flex-1 pb-24 md:pb-8">{children}</main>
      {itens.length > 1 && (
        <nav className="no-print fixed inset-x-0 bottom-0 z-40 flex border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
          {itens.map(({ to, label, icon: Icon, badge }) => (
            <Link key={to} to={to} className="relative flex flex-1 flex-col items-center gap-1 py-3 text-xs font-semibold text-muted-foreground"
              activeProps={{ className: "text-primary" }}>
              <Icon className="size-6" /> {label}
              {!!badge && <span className="absolute right-1/4 top-1.5 rounded-full bg-late px-1.5 text-[10px] text-primary-foreground">{badge}</span>}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  const sair = useSair();
  const { data: me } = useMe();
  return (
    <header className="bg-hero px-5 pb-10 pt-8 text-navy-foreground md:rounded-b-3xl">
      <div className="mx-auto max-w-5xl">
        <div className="mb-2 flex items-center justify-between md:hidden">
          <span className="text-sm font-bold opacity-80">Pontual<span className="text-justified">+</span></span>
          <button onClick={sair} className="no-print flex items-center gap-1 text-sm font-semibold opacity-80"><LogOut className="size-4" /> Sair</button>
        </div>
        <h1 className="text-2xl font-extrabold md:text-3xl">{title}</h1>
        {me?.escola && <p className="mt-2 break-words text-sm font-semibold">{me.escola.nome}</p>}
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

export function SemPermissao() {
  return <div className="p-8 text-center text-muted-foreground">Você não tem permissão para acessar esta tela.</div>;
}

export function Box({ n, l, c = "" }: { n: number; l: string; c?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className={`text-3xl font-extrabold ${c}`}>{n}</div>
      <div className="text-sm font-semibold text-muted-foreground">{l}</div>
    </div>
  );
}
