import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { fmtData, hojeISO, periodoDe, useStore } from "@/lib/store";

export const Route = createFileRoute("/alertas")({
  head: () => ({
    meta: [
      { title: "Painel da coordenação — Pontual+" },
      { name: "description", content: "Alertas de atrasos, totais por bimestre e encaminhamentos." },
      { property: "og:title", content: "Painel da coordenação — Pontual+" },
      { property: "og:description", content: "Alertas de atrasos, totais por bimestre e encaminhamentos." },
    ],
  }),
  component: Painel,
});

function Painel() {
  const { alertas, alunos, turmas, periodos, atrasos, config, analisarAlerta, auditoria } = useStore();
  const [pid, setPid] = useState(periodoDe(periodos, hojeISO())?.id ?? periodos[0]!.id);
  const [turmaId, setTurmaId] = useState("");
  const p = periodos.find((x) => x.id === pid)!;
  const turmaDe = (aid: string) => alunos.find((a) => a.id === aid)?.turmaId;
  const regs = atrasos.filter((a) => !a.cancelado && a.data >= p.inicio && a.data <= p.fim && (!turmaId || turmaDe(a.alunoId) === turmaId));
  const als = alertas.filter((a) => a.periodoId === pid && (!turmaId || turmaDe(a.alunoId) === turmaId));
  const sj = regs.filter((r) => !r.justificado).length;

  const analisar = (id: string) => {
    const t = window.prompt("Descreva o encaminhamento ou observação da coordenação:");
    if (!t?.trim()) return;
    analisarAlerta(id, t.trim());
    toast.success("Alerta marcado como analisado.");
  };

  return (
    <>
      <PageHeader title="Painel da coordenação" subtitle={`Alerta ao atingir ${config.limite} atrasos no bimestre`} />
      <div className="mx-auto max-w-5xl px-5 -mt-6 space-y-5">
        <div className="no-print grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <select value={pid} onChange={(e) => setPid(e.target.value)} className="rounded-xl border bg-card px-4 py-3 text-lg">
            {periodos.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
          <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} className="rounded-xl border bg-card px-4 py-3 text-lg">
            <option value="">Todas as turmas</option>
            {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          <button onClick={() => window.print()} className="flex items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3 font-bold"><Printer className="size-5" /> Imprimir</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Box n={regs.length} l="Total de atrasos" />
          <Box n={sj} l="Sem justificativa" c="text-late" />
          <Box n={regs.length - sj} l="Justificados" c="text-justified" />
          <Box n={als.filter((a) => a.status === "pendente").length} l="Alertas pendentes" c="text-late" />
        </div>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-bold text-lg mb-3">Alunos que atingiram o limite</h2>
          {als.length === 0 ? <p className="text-ok font-semibold">Nenhum alerta neste período.</p> : (
            <ul className="divide-y">
              {als.map((a) => {
                const al = alunos.find((x) => x.id === a.alunoId)!;
                return (
                  <li key={a.id} className="py-4 space-y-2">
                    <div className="flex flex-wrap justify-between gap-2">
                      <Link to="/alunos/$id" params={{ id: al.id }} className="font-bold text-primary">{al.nome}</Link>
                      <span className={`rounded-full px-3 py-1 text-sm font-bold ${a.status === "pendente" ? "bg-late-soft text-late" : "bg-ok-soft text-ok"}`}>
                        {a.status === "pendente" ? "Pendente de análise" : "Analisado"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{turmas.find((t) => t.id === al.turmaId)?.nome} · {a.quantidade} atrasos · alerta gerado em {fmtData(a.geradoEm.slice(0, 10))}</p>
                    {a.encaminhamento && <p className="text-sm rounded-lg bg-muted p-2">Encaminhamento: {a.encaminhamento}</p>}
                    {a.status === "pendente" && <button onClick={() => analisar(a.id)} className="no-print rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground">Registrar análise</button>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-bold text-lg mb-3">Histórico de alterações</h2>
          {auditoria.length === 0 ? <p className="text-muted-foreground">Nenhuma alteração registrada ainda.</p> : (
            <ul className="divide-y text-sm max-h-80 overflow-auto">
              {auditoria.map((x) => (
                <li key={x.id} className="py-2"><b>{new Date(x.quando).toLocaleString("pt-BR")}</b> · {x.usuario}<br />{x.operacao}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function Box({ n, l, c = "" }: { n: number; l: string; c?: string }) {
  return <div className="rounded-2xl border bg-card p-4"><div className={`text-3xl font-extrabold ${c}`}>{n}</div><div className="text-sm font-semibold text-muted-foreground">{l}</div></div>;
}
