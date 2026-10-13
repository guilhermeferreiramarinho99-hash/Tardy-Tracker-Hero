import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Bell, Clock, Users } from "lucide-react";
import { pageHead } from "@/lib/page-head";
import { PageHeader, Box } from "@/components/AppShell";
import { fmtData, fmtHora, hojeISO, periodoDe, useAlertas, useAlunos, useAtrasos, useMe, usePeriodos } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => pageHead("Início", "Resumo dos atrasos e alertas da sua escola no Pontual+."),
  component: Inicio,
});

function Inicio() {
  const { data: me } = useMe();
  const { data: atrasos } = useAtrasos();
  const { data: alunos } = useAlunos();
  const { data: periodos } = usePeriodos();
  const { data: alertas } = useAlertas(!!me?.isGestor);
  if (me && !me.isStaff) return <Navigate to="/meu-historico" />;
  const hoje = hojeISO();
  const p = periodoDe(periodos, hoje);
  const lista = atrasos ?? [];
  const doPeriodo = p ? lista.filter((a) => a.data >= p.inicio && a.data <= p.fim) : [];
  const deHoje = lista.filter((a) => a.data === hoje);
  const pend = (alertas ?? []).filter((a) => a.status === "pendente").length;

  return (
    <>
      <PageHeader title={`Olá, ${me?.nome.split(" ")[0] ?? ""}!`} subtitle={`Hoje é ${fmtData(hoje)} · ${p ? p.nome : "fora do período letivo"}`} />
      <div className="mx-auto -mt-6 max-w-5xl space-y-6 px-5">
        <Link to="/registrar" className="flex items-center gap-4 rounded-2xl bg-primary p-6 text-primary-foreground shadow-lg transition active:scale-[0.99]">
          <Clock className="size-10" />
          <div><div className="text-xl font-extrabold">Registrar atraso</div><div className="opacity-80">Toque aqui para começar</div></div>
        </Link>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Box n={deHoje.length} l="Atrasos hoje" />
          <Box n={doPeriodo.length} l="No bimestre" />
          <Box n={doPeriodo.filter((a) => !a.justificado).length} l="Sem justificativa" c="text-late" />
          <Box n={doPeriodo.filter((a) => a.justificado).length} l="Justificados" c="text-justified" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {me?.isGestor && (
            <Link to="/alertas" className="flex items-center gap-4 rounded-2xl border bg-card p-5">
              <Bell className={`size-8 ${pend ? "text-late" : "text-ok"}`} />
              <div><div className="text-lg font-bold">Alertas</div><div className="text-muted-foreground">{pend ? `${pend} pendente(s) de análise` : "Nenhum alerta pendente"}</div></div>
            </Link>
          )}
          <Link to="/alunos" className="flex items-center gap-4 rounded-2xl border bg-card p-5">
            <Users className="size-8 text-primary" />
            <div><div className="text-lg font-bold">Alunos</div><div className="text-muted-foreground">{alunos?.length ?? 0} cadastrados · ver históricos</div></div>
          </Link>
        </div>
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-3 text-lg font-bold">Registros de hoje</h2>
          {deHoje.length === 0 ? <p className="text-muted-foreground">Nenhum atraso registrado hoje.</p> : (
            <ul className="divide-y">
              {deHoje.map((a) => {
                const al = alunos?.find((x) => x.id === a.aluno_id);
                return (
                  <li key={a.id} className="flex flex-wrap justify-between gap-2 py-3">
                    {al ? <Link to="/alunos/$id" params={{ id: al.id }} className="font-semibold">{al.nome}</Link> : <span />}
                    <span className={`font-bold ${a.justificado ? "text-justified" : "text-late"}`}>{fmtHora(a.hora)} · {a.justificado ? "Justificado" : "Sem justificativa"}</span>
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
