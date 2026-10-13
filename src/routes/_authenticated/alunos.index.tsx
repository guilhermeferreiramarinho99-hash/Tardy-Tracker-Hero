import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { PageHeader, SemPermissao, Status } from "@/components/AppShell";
import { hojeISO, periodoDe, useAlunos, useAtrasos, useMe, usePeriodos, useTurmas } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/alunos/")({
  head: () => ({ meta: [{ title: "Alunos — Pontual+" }, { name: "description", content: "Pesquise alunos e consulte históricos." }] }),
  component: Alunos,
});

function Alunos() {
  const { data: me } = useMe();
  const { data: alunos } = useAlunos();
  const { data: turmas } = useTurmas();
  const { data: periodos } = usePeriodos();
  const { data: atrasos } = useAtrasos();
  const [busca, setBusca] = useState("");
  const [turmaId, setTurmaId] = useState("");
  if (me && !me.isStaff) return <SemPermissao />;
  const p = periodoDe(periodos, hojeISO());
  const lista = (alunos ?? []).filter((a) => (!turmaId || a.turma_id === turmaId) && a.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <>
      <PageHeader title="Alunos" subtitle={`Situação no ${p?.nome ?? "período atual"}`} />
      <div className="mx-auto -mt-6 max-w-5xl space-y-4 px-5">
        <div className="grid gap-3 md:grid-cols-[1fr_240px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar por nome" className="w-full rounded-xl border bg-card py-4 pl-12 pr-4 text-lg shadow-sm" />
          </div>
          <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} className="rounded-xl border bg-card px-4 py-4 text-lg shadow-sm">
            <option value="">Todas as turmas</option>
            {turmas?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <ul className="divide-y rounded-2xl border bg-card">
          {lista.map((a) => {
            const r = p ? (atrasos ?? []).filter((x) => x.aluno_id === a.id && x.data >= p.inicio && x.data <= p.fim) : [];
            const sj = r.filter((x) => !x.justificado).length;
            return (
              <li key={a.id}>
                <Link to="/alunos/$id" params={{ id: a.id }} className="flex flex-wrap items-center justify-between gap-2 px-4 py-4">
                  <div>
                    <div className="font-bold">{a.nome}{!a.ativo && <span className="ml-2 text-xs text-muted-foreground">(inativo)</span>}</div>
                    <div className="text-sm text-muted-foreground">{turmas?.find((t) => t.id === a.turma_id)?.nome} · {a.codigo}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-muted-foreground">{r.length} atraso(s)</span>
                    <Status tipo={r.length === 0 ? "ok" : sj > 0 ? "late" : "justified"} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
