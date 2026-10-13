import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { PageHeader, Status } from "@/components/AppShell";
import { hojeISO, periodoDe, useStore } from "@/lib/store";

export const Route = createFileRoute("/alunos/")({
  head: () => ({
    meta: [
      { title: "Alunos — Pontual+" },
      { name: "description", content: "Pesquise alunos por nome e turma e consulte históricos." },
      { property: "og:title", content: "Alunos — Pontual+" },
      { property: "og:description", content: "Pesquise alunos e consulte históricos de atraso." },
    ],
  }),
  component: Alunos,
});

function Alunos() {
  const { alunos, turmas, periodos, atrasosNoPeriodo } = useStore();
  const [busca, setBusca] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const p = periodoDe(periodos, hojeISO());
  const lista = alunos
    .filter((a) => (!turmaId || a.turmaId === turmaId) && a.nome.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <>
      <PageHeader title="Alunos" subtitle={`Situação no ${p?.nome ?? "período atual"}`} />
      <div className="mx-auto max-w-5xl px-5 -mt-6 space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_240px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar por nome"
              className="w-full rounded-xl border bg-card pl-12 pr-4 py-4 text-lg shadow-sm" />
          </div>
          <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} className="rounded-xl border bg-card px-4 py-4 text-lg shadow-sm">
            <option value="">Todas as turmas</option>
            {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <ul className="rounded-2xl border bg-card divide-y">
          {lista.map((a) => {
            const r = atrasosNoPeriodo(a.id, p?.id);
            const sj = r.filter((x) => !x.justificado).length;
            return (
              <li key={a.id}>
                <Link to="/alunos/$id" params={{ id: a.id }} className="flex flex-wrap items-center justify-between gap-2 px-4 py-4">
                  <div>
                    <div className="font-bold">{a.nome}</div>
                    <div className="text-sm text-muted-foreground">{turmas.find((t) => t.id === a.turmaId)?.nome} · {a.codigo}</div>
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
