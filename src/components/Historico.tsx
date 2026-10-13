import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Status, Box } from "@/components/AppShell";
import { PeriodCalendar } from "@/components/MonthCalendar";
import { erroAmigavel, fmtData, fmtHora, periodoAtualOuUltimo, useAlunos, useAtrasos, useEncaminhamentos, useMe, usePeriodos, useTurmas } from "@/lib/api";
import type { ReactNode } from "react";

export function Historico({ alunoId, voltar }: { alunoId: string; voltar?: ReactNode }) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: alunos, isLoading } = useAlunos();
  const { data: turmas } = useTurmas();
  const { data: periodos } = usePeriodos();
  const { data: atrasos } = useAtrasos();
  const { data: encs } = useEncaminhamentos(!!me?.isGestor);
  const [pidSel, setPid] = useState<string>();

  if (isLoading || !periodos) return <div className="p-8 text-muted-foreground">Carregando…</div>;
  const aluno = alunos?.find((a) => a.id === alunoId);
  if (!aluno) return <div className="p-8 text-muted-foreground">Histórico não encontrado ou sem permissão de acesso.</div>;
  const periodo = periodos.find((p) => p.id === pidSel) ?? periodoAtualOuUltimo(periodos);
  if (!periodo) return <div className="p-8">Nenhum bimestre configurado.</div>;

  const doAluno = (atrasos ?? []).filter((a) => a.aluno_id === aluno.id);
  const noPeriodo = (p: { inicio: string; fim: string }) => doAluno.filter((a) => a.data >= p.inicio && a.data <= p.fim);
  const regs = noPeriodo(periodo);
  const sj = regs.filter((r) => !r.justificado).length;

  const acao = async (id: string, tipo: "corrigir" | "cancelar", atual: boolean) => {
    const motivo = window.prompt(tipo === "corrigir" ? `Mudar para "${atual ? "sem justificativa" : "justificado"}". Motivo (obrigatório):` : "Motivo do cancelamento (obrigatório):");
    if (!motivo?.trim()) return;
    const { error } = tipo === "corrigir"
      ? await supabase.rpc("corrigir_atraso", { _id: id, _justificado: !atual, _motivo: motivo.trim() })
      : await supabase.rpc("cancelar_atraso", { _id: id, _motivo: motivo.trim() });
    if (error) { toast.error(erroAmigavel(error)); return; }
    toast.success("Alteração salva e registrada no histórico de alterações.");
    qc.invalidateQueries();
  };

  return (
    <>
      <PageHeader title={aluno.nome} subtitle={`${turmas?.find((t) => t.id === aluno.turma_id)?.nome ?? ""} · ${aluno.codigo}${aluno.ativo ? "" : " · inativo"}`}>
        {voltar}
      </PageHeader>
      <div className="mx-auto -mt-6 max-w-5xl space-y-5 px-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {periodos.map((p) => (
            <button key={p.id} onClick={() => setPid(p.id)}
              className={`shrink-0 rounded-full border px-4 py-2 font-bold ${p.id === periodo.id ? "bg-navy text-navy-foreground" : "bg-card"}`}>{p.nome}</button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Box n={regs.length} l="Total" />
          <Box n={sj} l="Sem justificativa" c="text-late" />
          <Box n={regs.length - sj} l="Justificados" c="text-justified" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Status tipo={regs.length === 0 ? "ok" : sj > 0 ? "late" : "justified"} />
          <span className="text-sm text-muted-foreground">{fmtData(periodo.inicio)} a {fmtData(periodo.fim)}</span>
        </div>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-3 text-lg font-bold">Ocorrências</h2>
          {regs.length === 0 ? <p className="font-semibold text-ok">Nenhum atraso registrado neste bimestre.</p> : (
            <ul className="divide-y">
              {regs.map((r) => (
                <li key={r.id} className="space-y-1 py-3">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-bold">{fmtData(r.data)} às {fmtHora(r.hora)}</span>
                    <Status tipo={r.justificado ? "justified" : "late"} />
                  </div>
                  {r.observacao && <p className="text-sm">Obs.: {r.observacao}</p>}
                  {me?.isStaff && <p className="text-xs text-muted-foreground">Registrado por {r.registrado_por_nome || "—"}</p>}
                  {me?.isGestor && (
                    <div className="no-print flex gap-4 text-sm font-semibold">
                      <button onClick={() => acao(r.id, "corrigir", r.justificado)} className="text-primary">Corrigir justificativa</button>
                      <button onClick={() => acao(r.id, "cancelar", r.justificado)} className="text-late">Cancelar registro</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-3 text-lg font-bold">Calendário · {periodo.nome}</h2>
          <PeriodCalendar periodo={periodo} atrasos={regs} />
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-3 text-lg font-bold">Resumo por bimestre</h2>
          <table className="w-full text-left">
            <thead className="text-sm text-muted-foreground"><tr><th className="py-2">Bimestre</th><th>Total</th><th>Sem just.</th><th>Just.</th></tr></thead>
            <tbody>
              {periodos.map((p) => {
                const x = noPeriodo(p);
                const s = x.filter((r) => !r.justificado).length;
                return <tr key={p.id} className="border-t"><td className="py-2 font-semibold">{p.nome}</td><td>{x.length}</td><td className="font-bold text-late">{s}</td><td className="font-bold text-justified">{x.length - s}</td></tr>;
              })}
            </tbody>
          </table>
        </section>

        {me?.isGestor && (
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 text-lg font-bold">Encaminhamentos da coordenação</h2>
            {(encs ?? []).filter((e) => e.aluno_id === aluno.id).length === 0 ? <p className="text-muted-foreground">Nenhum encaminhamento.</p> : (
              <ul className="divide-y text-sm">
                {(encs ?? []).filter((e) => e.aluno_id === aluno.id).map((e) => (
                  <li key={e.id} className="py-2"><b>{fmtData(e.created_at)}</b> · {e.autor_nome}<br />{e.texto}</li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </>
  );
}
