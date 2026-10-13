import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Box, PageHeader, SemPermissao } from "@/components/AppShell";
import { pageHead } from "@/lib/page-head";
import { erroAmigavel, fmtData, periodoAtualOuUltimo, useAlertas, useAlunos, useAtrasos, useConfig, useEncaminhamentos, useMe, usePeriodos, useTurmas } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/alertas")({
  head: () => pageHead("Painel da coordenação", "Alertas e encaminhamentos restritos à coordenação da sua escola no Pontual+."),
  component: Painel,
});

function Painel() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const ok = !!me?.isGestor;
  const { data: alertas } = useAlertas(ok);
  const { data: encs } = useEncaminhamentos(ok);
  const { data: alunos } = useAlunos();
  const { data: turmas } = useTurmas();
  const { data: periodos } = usePeriodos();
  const { data: atrasos } = useAtrasos();
  const { data: config } = useConfig();
  const [pidSel, setPid] = useState<string>();
  const [ano, setAno] = useState("");
  const [turmaId, setTurmaId] = useState("");
  if (me && !ok) return <SemPermissao />;
  const p = periodos?.find((x) => x.id === pidSel) ?? periodoAtualOuUltimo(periodos);
  if (!p) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  const anos = [...new Set((turmas ?? []).map((t) => t.ano))];
  const turmaDe = (aid: string) => alunos?.find((a) => a.id === aid)?.turma_id;
  const passa = (aid: string) => {
    const t = turmas?.find((x) => x.id === turmaDe(aid));
    return (!turmaId || t?.id === turmaId) && (!ano || t?.ano === ano);
  };
  const regs = (atrasos ?? []).filter((a) => a.data >= p.inicio && a.data <= p.fim && passa(a.aluno_id));
  const als = (alertas ?? []).filter((a) => a.periodo_id === p.id && passa(a.aluno_id));
  const sj = regs.filter((r) => !r.justificado).length;

  const analisar = async (id: string) => {
    const t = window.prompt("Descreva a análise ou o encaminhamento da coordenação:");
    if (!t?.trim()) return;
    const { error } = await supabase.rpc("analisar_alerta", { _id: id, _texto: t.trim() });
    if (error) { toast.error(erroAmigavel(error)); return; }
    toast.success("Alerta marcado como analisado.");
    qc.invalidateQueries({ queryKey: ["alertas"] });
    qc.invalidateQueries({ queryKey: ["encaminhamentos"] });
  };

  const sel = "rounded-xl border bg-card px-4 py-3 text-lg";
  return (
    <>
      <PageHeader title="Painel da coordenação" subtitle={`Alerta ao atingir ${config?.limite ?? 3} atrasos no bimestre${config && !config.contar_justificados ? " (sem contar justificados)" : ""}`} />
      <div className="mx-auto -mt-6 max-w-5xl space-y-5 px-5">
        <div className="no-print grid gap-3 sm:grid-cols-4">
          <select value={p.id} onChange={(e) => setPid(e.target.value)} className={sel}>
            {periodos?.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
          <select value={ano} onChange={(e) => { setAno(e.target.value); setTurmaId(""); }} className={sel}>
            <option value="">Todos os anos</option>
            {anos.map((a) => <option key={a}>{a}</option>)}
          </select>
          <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} className={sel}>
            <option value="">Todas as turmas</option>
            {turmas?.filter((t) => !ano || t.ano === ano).map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          <button onClick={() => window.print()} className="flex items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3 font-bold"><Printer className="size-5" /> Imprimir</button>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Box n={regs.length} l="Total de atrasos" />
          <Box n={sj} l="Sem justificativa" c="text-late" />
          <Box n={regs.length - sj} l="Justificados" c="text-justified" />
          <Box n={als.filter((a) => a.status === "pendente").length} l="Alertas pendentes" c="text-late" />
        </div>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-3 text-lg font-bold">Alunos que atingiram o limite</h2>
          {als.length === 0 ? <p className="font-semibold text-ok">Nenhum alerta neste período.</p> : (
            <ul className="divide-y">
              {als.map((a) => {
                const al = alunos?.find((x) => x.id === a.aluno_id);
                if (!al) return null;
                const enc = (encs ?? []).filter((e) => e.alerta_id === a.id);
                return (
                  <li key={a.id} className="space-y-2 py-4">
                    <div className="flex flex-wrap justify-between gap-2">
                      <Link to="/alunos/$id" params={{ id: al.id }} className="font-bold text-primary">{al.nome}</Link>
                      <span className={`rounded-full px-3 py-1 text-sm font-bold ${a.status === "pendente" ? "bg-late-soft text-late" : "bg-ok-soft text-ok"}`}>
                        {a.status === "pendente" ? "Pendente de análise" : "Analisado"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{turmas?.find((t) => t.id === al.turma_id)?.nome} · {a.quantidade} atraso(s) · alerta gerado em {fmtData(a.gerado_em)}</p>
                    {enc.map((e) => <p key={e.id} className="rounded-lg bg-muted p-2 text-sm"><b>{fmtData(e.created_at)} · {e.autor_nome}:</b> {e.texto}</p>)}
                    {a.status === "pendente" && <button onClick={() => analisar(a.id)} className="no-print rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground">Registrar análise</button>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-3 text-lg font-bold">Relatório do período</h2>
          <table className="w-full text-left text-sm">
            <thead className="text-muted-foreground"><tr><th className="py-2">Aluno</th><th>Turma</th><th>Total</th><th>Sem just.</th></tr></thead>
            <tbody>
              {Object.entries(regs.reduce<Record<string, { t: number; s: number }>>((acc, r) => {
                const x = (acc[r.aluno_id] ??= { t: 0, s: 0 }); x.t++; if (!r.justificado) x.s++; return acc;
              }, {})).sort((a, b) => b[1].t - a[1].t).map(([aid, v]) => {
                const al = alunos?.find((x) => x.id === aid);
                return <tr key={aid} className="border-t"><td className="py-2 font-semibold">{al?.nome}</td><td>{turmas?.find((t) => t.id === al?.turma_id)?.nome}</td><td>{v.t}</td><td className="font-bold text-late">{v.s}</td></tr>;
              })}
            </tbody>
          </table>
          {regs.length === 0 && <p className="text-muted-foreground">Sem registros no período.</p>}
        </section>
      </div>
    </>
  );
}
