import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileSpreadsheet, Printer } from "lucide-react";
import { PageHeader, SemPermissao } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/page-head";
import { fmtData, periodoAtualOuUltimo, useAlertas, useAlunos, useAtrasos, useConfig, useMe, usePeriodos, useTurmas } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => pageHead("Relatórios", "Planilha de atrasos por bimestre e turma no Pontual+."),
  component: Relatorios,
});

function Relatorios() {
  const { data: me } = useMe();
  const { data: periodos } = usePeriodos();
  const { data: turmas } = useTurmas();
  const { data: alunos } = useAlunos();
  const { data: atrasos } = useAtrasos();
  const { data: config } = useConfig();
  const { data: alertas } = useAlertas(!!me?.isGestor);
  const [pid, setPid] = useState("");
  const [tid, setTid] = useState("");
  const p = periodos?.find((x) => x.id === pid) ?? periodoAtualOuUltimo(periodos);
  const limite = config?.limite ?? 3;
  const turma = turmas?.find((t) => t.id === tid);

  const linhas = useMemo(() => {
    if (!p) return [];
    return (alunos ?? [])
      .filter((a) => a.ativo && (!tid || a.turma_id === tid))
      .map((a) => {
        const lista = (atrasos ?? []).filter((x) => x.aluno_id === a.id && x.data >= p.inicio && x.data <= p.fim);
        const just = lista.filter((x) => x.justificado).length;
        const pend = (alertas ?? []).some((x) => x.aluno_id === a.id && x.status === "pendente");
        return { nome: a.nome, codigo: a.codigo, turma: turmas?.find((t) => t.id === a.turma_id)?.nome ?? "", total: lista.length, just, sem: lista.length - just, pend };
      })
      .sort((x, y) => x.turma.localeCompare(y.turma) || x.nome.localeCompare(y.nome));
  }, [p, alunos, atrasos, alertas, turmas, tid]);

  if (!me?.isStaff) return <SemPermissao />;

  const situacao = (l: (typeof linhas)[number]) =>
    l.pend ? ["bg-justified-soft text-justified", "Alerta pendente"] :
    l.total >= limite ? ["bg-late-soft text-late", "Atingiu o limite"] :
    l.total > 0 ? ["bg-yellow-100 text-yellow-800", "Com atrasos"] : ["bg-ok-soft text-ok", "Regular"];

  const titulo = `${me.escola?.nome ?? ""} — ${p?.nome ?? ""} (${p ? fmtData(p.inicio) + " a " + fmtData(p.fim) : ""}) — ${turma?.nome ?? "Todas as turmas"}`;

  const excel = async () => {
    const XLSX = await import("xlsx");
    const dados = [[titulo], [], ["Aluno", "Código", "Turma", "Total", "Justificados", "Sem justificativa", "Situação"],
      ...linhas.map((l) => [l.nome, l.codigo, l.turma, l.total, l.just, l.sem, situacao(l)[1]])];
    const ws = XLSX.utils.aoa_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `relatorio-${(p?.nome ?? "periodo").replace(/\s+/g, "-")}.xlsx`);
  };

  const sel = "h-12 rounded-xl border bg-card px-3";
  return (
    <>
      <PageHeader title="Relatórios" subtitle="Planilha de atrasos por bimestre e turma" />
      <div className="mx-auto -mt-6 max-w-5xl space-y-4 px-5">
        <div className="no-print grid gap-3 sm:grid-cols-4">
          <select aria-label="Bimestre" value={p?.id ?? ""} onChange={(e) => setPid(e.target.value)} className={sel}>
            {periodos?.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
          <select aria-label="Turma" value={tid} onChange={(e) => setTid(e.target.value)} className={sel}>
            <option value="">Todas as turmas</option>
            {turmas?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          <Button className="h-12" onClick={excel}><FileSpreadsheet /> Excel</Button>
          <Button variant="outline" className="h-12" onClick={() => window.print()}><Printer /> PDF / Imprimir</Button>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <h2 className="mb-1 font-extrabold">{titulo}</h2>
          <p className="mb-3 text-xs text-muted-foreground">Verde = regular · Amarelo = com atrasos · Vermelho = atingiu {limite} · Laranja = alerta pendente de análise. Gerado em {fmtData(new Date().toISOString())}.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left"><th className="p-2">Aluno</th><th className="p-2">Turma</th><th className="p-2">Total</th><th className="p-2">Just.</th><th className="p-2">Sem just.</th><th className="p-2">Situação</th></tr></thead>
              <tbody>
                {linhas.map((l) => { const s = situacao(l); return (
                  <tr key={l.codigo + l.nome} className="border-b">
                    <td className="p-2 font-semibold">{l.nome}</td><td className="p-2">{l.turma}</td>
                    <td className="p-2">{l.total}</td><td className="p-2">{l.just}</td><td className="p-2">{l.sem}</td>
                    <td className="p-2"><span className={`rounded-full px-2 py-1 text-xs font-bold ${s[0]}`}>{s[1]}</span></td>
                  </tr>); })}
                {linhas.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Nenhum aluno.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
