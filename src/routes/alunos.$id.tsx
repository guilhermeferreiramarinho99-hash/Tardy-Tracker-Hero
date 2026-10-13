import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader, Status } from "@/components/AppShell";
import { PeriodCalendar } from "@/components/MonthCalendar";
import { fmtData, hojeISO, periodoDe, useStore } from "@/lib/store";

export const Route = createFileRoute("/alunos/$id")({
  head: () => ({
    meta: [
      { title: "Histórico do aluno — Pontual+" },
      { name: "description", content: "Histórico individual de atrasos por bimestre." },
      { property: "og:title", content: "Histórico do aluno — Pontual+" },
      { property: "og:description", content: "Histórico individual de atrasos por bimestre." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Historico,
});

function Historico() {
  const { id } = Route.useParams();
  const { alunos, turmas, periodos, atrasosNoPeriodo, corrigir, cancelar } = useStore();
  const aluno = alunos.find((a) => a.id === id);
  const [pid, setPid] = useState(periodoDe(periodos, hojeISO())?.id ?? periodos[0]!.id);
  if (!aluno) return <div className="p-8">Aluno não encontrado. <Link to="/alunos" className="text-primary underline">Voltar</Link></div>;
  const periodo = periodos.find((p) => p.id === pid)!;
  const regs = atrasosNoPeriodo(aluno.id, pid);
  const sj = regs.filter((r) => !r.justificado).length;

  const acao = (rid: string, tipo: "corrigir" | "cancelar", atual: boolean) => {
    const motivo = window.prompt(tipo === "corrigir" ? "Motivo da correção (obrigatório):" : "Motivo do cancelamento (obrigatório):");
    if (!motivo?.trim()) { toast.error("É preciso informar um motivo."); return; }
    if (tipo === "corrigir") corrigir(rid, !atual, motivo.trim()); else cancelar(rid, motivo.trim());
    toast.success("Alteração salva e registrada no histórico de alterações.");
  };

  return (
    <>
      <PageHeader title={aluno.nome} subtitle={`${turmas.find((t) => t.id === aluno.turmaId)?.nome} · ${aluno.codigo}`}>
        <Link to="/alunos" className="no-print mt-3 inline-flex items-center gap-1 text-sm font-semibold opacity-80"><ArrowLeft className="size-4" /> Voltar</Link>
      </PageHeader>
      <div className="mx-auto max-w-5xl px-5 -mt-6 space-y-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {periodos.map((p) => (
            <button key={p.id} onClick={() => setPid(p.id)}
              className={`shrink-0 rounded-full px-4 py-2 font-bold border ${p.id === pid ? "bg-navy text-navy-foreground" : "bg-card"}`}>{p.nome}</button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Box n={regs.length} l="Total" />
          <Box n={sj} l="Sem justificativa" c="text-late" />
          <Box n={regs.length - sj} l="Justificados" c="text-justified" />
        </div>
        <div><Status tipo={regs.length === 0 ? "ok" : sj > 0 ? "late" : "justified"} /> <span className="text-sm text-muted-foreground ml-2">{fmtData(periodo.inicio)} a {fmtData(periodo.fim)}</span></div>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-bold text-lg mb-3">Ocorrências</h2>
          {regs.length === 0 ? <p className="text-ok font-semibold">Nenhum atraso registrado neste bimestre.</p> : (
            <ul className="divide-y">
              {regs.map((r) => (
                <li key={r.id} className="py-3 space-y-1">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-bold">{fmtData(r.data)} às {r.hora}</span>
                    <Status tipo={r.justificado ? "justified" : "late"} />
                  </div>
                  {r.observacao && <p className="text-sm">Obs.: {r.observacao}</p>}
                  <p className="text-xs text-muted-foreground">Registrado por {r.registradoPor}</p>
                  <div className="no-print flex gap-3 text-sm font-semibold">
                    <button onClick={() => acao(r.id, "corrigir", r.justificado)} className="text-primary">Corrigir justificativa</button>
                    <button onClick={() => acao(r.id, "cancelar", r.justificado)} className="text-late">Cancelar registro</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-bold text-lg mb-3">Calendário do {periodo.nome}</h2>
          <PeriodCalendar periodo={periodo} atrasos={regs} />
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-bold text-lg mb-3">Resumo por bimestre</h2>
          <table className="w-full text-left">
            <thead className="text-sm text-muted-foreground"><tr><th className="py-2">Bimestre</th><th>Total</th><th>Sem just.</th><th>Just.</th></tr></thead>
            <tbody>
              {periodos.map((p) => {
                const x = atrasosNoPeriodo(aluno.id, p.id);
                const s = x.filter((r) => !r.justificado).length;
                return <tr key={p.id} className="border-t"><td className="py-2 font-semibold">{p.nome}</td><td>{x.length}</td><td className="text-late font-bold">{s}</td><td className="text-justified font-bold">{x.length - s}</td></tr>;
              })}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}

function Box({ n, l, c = "" }: { n: number; l: string; c?: string }) {
  return <div className="rounded-2xl border bg-card p-4 text-center"><div className={`text-3xl font-extrabold ${c}`}>{n}</div><div className="text-xs font-semibold text-muted-foreground">{l}</div></div>;
}
