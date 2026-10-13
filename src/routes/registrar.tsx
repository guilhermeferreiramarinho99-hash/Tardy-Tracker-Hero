import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Search } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { agoraHora, fmtData, hojeISO, useStore } from "@/lib/store";
import type { Alerta } from "@/lib/data";

export const Route = createFileRoute("/registrar")({
  head: () => ({
    meta: [
      { title: "Registrar atraso — Pontual+" },
      { name: "description", content: "Registre o atraso de um aluno em poucos toques." },
      { property: "og:title", content: "Registrar atraso — Pontual+" },
      { property: "og:description", content: "Registre o atraso de um aluno em poucos toques." },
    ],
  }),
  component: Registrar,
});

function Registrar() {
  const { turmas, alunos, registrar } = useStore();
  const [turmaId, setTurmaId] = useState("");
  const [busca, setBusca] = useState("");
  const [alunoId, setAlunoId] = useState("");
  const [just, setJust] = useState<boolean | null>(null);
  const [obs, setObs] = useState("");
  const [alerta, setAlerta] = useState<Alerta | null>(null);

  const lista = alunos
    .filter((a) => a.ativo && (!turmaId || a.turmaId === turmaId) && a.nome.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => a.nome.localeCompare(b.nome));
  const aluno = alunos.find((a) => a.id === alunoId);

  const confirmar = () => {
    if (!aluno || just === null) return;
    const r = registrar({ alunoId, data: hojeISO(), hora: agoraHora(), justificado: just, observacao: obs.trim() || undefined });
    if (!r.ok) { toast.error(r.erro); return; }
    toast.success(`Atraso de ${aluno.nome} registrado.`);
    if (r.alerta) setAlerta(r.alerta);
    setAlunoId(""); setJust(null); setObs(""); setBusca("");
  };

  const alertaAluno = alerta && alunos.find((a) => a.id === alerta.alunoId);

  return (
    <>
      <PageHeader title="Registrar atraso" subtitle={`${fmtData(hojeISO())} · horário registrado automaticamente`} />
      <div className="mx-auto max-w-3xl px-5 -mt-6 space-y-5">
        {alerta && alertaAluno && (
          <div role="alert" className="rounded-2xl border-2 border-late bg-late-soft p-5">
            <div className="flex items-center gap-2 text-late font-extrabold text-lg"><AlertTriangle /> Alerta: limite de atrasos atingido</div>
            <p className="mt-2"><b>{alertaAluno.nome}</b> · {turmas.find((t) => t.id === alertaAluno.turmaId)?.nome} chegou a <b>{alerta.quantidade} atrasos</b> neste bimestre. A coordenação foi sinalizada para análise.</p>
            <div className="mt-3 flex gap-3">
              <Link to="/alunos/$id" params={{ id: alertaAluno.id }} className="rounded-xl bg-late px-4 py-2 font-bold text-primary-foreground">Ver histórico</Link>
              <button onClick={() => setAlerta(null)} className="rounded-xl border bg-card px-4 py-2 font-bold">Fechar</button>
            </div>
          </div>
        )}

        <Step n={1} title="Selecione a turma">
          <select value={turmaId} onChange={(e) => { setTurmaId(e.target.value); setAlunoId(""); }}
            className="w-full rounded-xl border bg-card px-4 py-4 text-lg">
            <option value="">Todas as turmas</option>
            {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </Step>

        <Step n={2} title="Pesquise e selecione o aluno">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite o nome do aluno"
              className="w-full rounded-xl border bg-card pl-12 pr-4 py-4 text-lg" />
          </div>
          <div className="mt-3 max-h-72 overflow-auto rounded-xl border bg-card divide-y">
            {lista.length === 0 && <p className="p-4 text-muted-foreground">Nenhum aluno encontrado.</p>}
            {lista.map((a) => (
              <button key={a.id} onClick={() => setAlunoId(a.id)}
                className={`w-full text-left px-4 py-3 flex justify-between items-center ${alunoId === a.id ? "bg-accent" : ""}`}>
                <span className="font-semibold">{a.nome}</span>
                <span className="text-sm text-muted-foreground">{turmas.find((t) => t.id === a.turmaId)?.nome}</span>
              </button>
            ))}
          </div>
        </Step>

        {aluno && (
          <>
            <Step n={3} title="Existe justificativa?">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setJust(false)} className={`rounded-xl border-2 p-4 font-bold text-lg ${just === false ? "border-late bg-late-soft text-late" : "bg-card"}`}>Não</button>
                <button onClick={() => setJust(true)} className={`rounded-xl border-2 p-4 font-bold text-lg ${just === true ? "border-justified bg-justified-soft text-justified" : "bg-card"}`}>Sim</button>
              </div>
            </Step>
            <Step n={4} title="Observação (opcional)">
              <input maxLength={120} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: ônibus atrasou"
                className="w-full rounded-xl border bg-card px-4 py-4 text-lg" />
            </Step>
            <button disabled={just === null} onClick={confirmar}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-5 text-xl font-extrabold text-primary-foreground disabled:opacity-40">
              <CheckCircle2 /> Confirmar atraso de {aluno.nome.split(" ")[0]}
            </button>
          </>
        )}
      </div>
    </>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <h2 className="mb-3 flex items-center gap-3 font-bold text-lg">
        <span className="grid size-8 place-items-center rounded-full bg-navy text-navy-foreground text-sm">{n}</span>{title}
      </h2>
      {children}
    </section>
  );
}
