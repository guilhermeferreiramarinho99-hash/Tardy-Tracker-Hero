import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Clock, Users } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { fmtData, hojeISO, periodoDe, useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pontual+ — Registro de atrasos escolares" },
      { name: "description", content: "Pontual+: registro digital de atrasos de alunos e acompanhamento pela coordenação." },
      { property: "og:title", content: "Pontual+ — Registro de atrasos escolares" },
      { property: "og:description", content: "Registro digital de atrasos e alertas para a coordenação escolar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Inicio,
});

function Inicio() {
  const { atrasos, alertas, periodos, alunos } = useStore();
  const hoje = hojeISO();
  const p = periodoDe(periodos, hoje);
  const doPeriodo = atrasos.filter((a) => !a.cancelado && p && a.data >= p.inicio && a.data <= p.fim);
  const deHoje = atrasos.filter((a) => !a.cancelado && a.data === hoje);
  const pend = alertas.filter((a) => a.status === "pendente").length;

  return (
    <>
      <PageHeader title="Olá! 👋" subtitle={`Hoje é ${fmtData(hoje)} · ${p ? p.nome : "fora do período letivo"}`} />
      <div className="mx-auto max-w-5xl px-5 -mt-6 space-y-6">
        <Link to="/registrar" className="flex items-center gap-4 rounded-2xl bg-primary p-6 text-primary-foreground shadow-lg active:scale-[0.99] transition">
          <Clock className="size-10" />
          <div><div className="text-xl font-extrabold">Registrar atraso</div><div className="opacity-80">Toque aqui para começar</div></div>
        </Link>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card n={deHoje.length} label="Atrasos hoje" />
          <Card n={doPeriodo.length} label="No bimestre" />
          <Card n={doPeriodo.filter((a) => !a.justificado).length} label="Sem justificativa" cls="text-late" />
          <Card n={doPeriodo.filter((a) => a.justificado).length} label="Justificados" cls="text-justified" />
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <Link to="/alertas" className="flex items-center gap-4 rounded-2xl border bg-card p-5">
            <Bell className={`size-8 ${pend ? "text-late" : "text-ok"}`} />
            <div><div className="font-bold text-lg">Alertas</div><div className="text-muted-foreground">{pend ? `${pend} pendente(s) de análise` : "Nenhum alerta pendente"}</div></div>
          </Link>
          <Link to="/alunos" className="flex items-center gap-4 rounded-2xl border bg-card p-5">
            <Users className="size-8 text-primary" />
            <div><div className="font-bold text-lg">Alunos</div><div className="text-muted-foreground">{alunos.length} cadastrados · ver históricos</div></div>
          </Link>
        </div>
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-bold text-lg mb-3">Registros de hoje</h2>
          {deHoje.length === 0 ? <p className="text-muted-foreground">Nenhum atraso registrado hoje.</p> : (
            <ul className="divide-y">
              {deHoje.map((a) => {
                const al = alunos.find((x) => x.id === a.alunoId)!;
                return (
                  <li key={a.id} className="py-3 flex justify-between gap-2">
                    <Link to="/alunos/$id" params={{ id: al.id }} className="font-semibold">{al.nome}</Link>
                    <span className={a.justificado ? "text-justified font-bold" : "text-late font-bold"}>{a.hora} · {a.justificado ? "Justificado" : "Sem justificativa"}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function Card({ n, label, cls = "" }: { n: number; label: string; cls?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className={`text-3xl font-extrabold ${cls}`}>{n}</div>
      <div className="text-sm text-muted-foreground font-semibold">{label}</div>
    </div>
  );
}
