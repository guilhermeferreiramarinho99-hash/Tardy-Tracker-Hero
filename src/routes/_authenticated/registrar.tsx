import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, SemPermissao } from "@/components/AppShell";
import { ehErroDeRede, enfileirar, estaSemInternet } from "@/lib/fila";
import { pageHead } from "@/lib/page-head";
import { combinaBusca, erroAmigavel, fmtData, hojeISO, horaAtual, useAlunos, useMe, useTurmas } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/registrar")({
  head: () => pageHead("Registrar atraso", "Registro autorizado de atrasos escolares no Pontual+."),
  component: Registrar,
});

type AlertaInfo = { aluno: string; alunoId: string; turma: string; quantidade: number };

function Registrar() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: turmas } = useTurmas();
  const { data: alunos } = useAlunos();
  const [turmaId, setTurmaId] = useState("");
  const [busca, setBusca] = useState("");
  const [alunoId, setAlunoId] = useState("");
  const [just, setJust] = useState<boolean | null>(null);
  const [obs, setObs] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [alerta, setAlerta] = useState<AlertaInfo | null>(null);

  if (me && !me.isStaff) return <SemPermissao />;

  const lista = (alunos ?? [])
    .filter((a) => a.ativo && (!turmaId || a.turma_id === turmaId) && combinaBusca(a, busca));
  const aluno = alunos?.find((a) => a.id === alunoId);
  const nomeTurma = (id: string) => turmas?.find((t) => t.id === id)?.nome ?? "";

  const limpar = () => { setAlunoId(""); setJust(null); setObs(""); setBusca(""); };

  // Sem sinal, o atraso fica guardado neste aparelho e é enviado quando a conexão voltar.
  const guardarSemInternet = async (a: { id: string; nome: string; turma_id: string }) => {
    if (!me) return;
    await enfileirar({
      id: crypto.randomUUID(), userId: me.id, alunoId: a.id, alunoNome: a.nome,
      turmaNome: nomeTurma(a.turma_id), justificado: just === true, observacao: obs.trim(),
      data: hojeISO(), hora: horaAtual(), criadoEm: new Date().toISOString(),
    });
    setEnviando(false);
    toast.info(`Sem internet: o atraso de ${a.nome} ficou guardado neste celular e será enviado quando a conexão voltar.`);
    limpar();
  };

  const confirmar = async () => {
    if (!aluno || just === null || enviando || !me) return;
    setEnviando(true);
    if (estaSemInternet()) { await guardarSemInternet(aluno); return; }
    try {
      const { data, error } = await supabase.rpc("registrar_atraso", { _aluno: aluno.id, _justificado: just, _observacao: obs.trim() });
      if (error && ehErroDeRede(error)) throw error;
      setEnviando(false);
      if (error) { toast.error(erroAmigavel(error)); return; }
      const r = data as { quantidade: number; alerta_novo: boolean };
      toast.success(`Atraso de ${aluno.nome} registrado.`);
      if (r.alerta_novo) setAlerta({ aluno: aluno.nome, alunoId: aluno.id, turma: nomeTurma(aluno.turma_id), quantidade: r.quantidade });
      limpar();
      qc.invalidateQueries({ queryKey: ["atrasos"] });
      qc.invalidateQueries({ queryKey: ["alertas"] });
    } catch (e) {
      if (ehErroDeRede(e)) { await guardarSemInternet(aluno); return; }
      setEnviando(false);
      toast.error(erroAmigavel(e));
    }
  };

  return (
    <>
      <PageHeader title="Registrar atraso" subtitle={`${fmtData(hojeISO())} · data e horário registrados automaticamente`} />
      <div className="mx-auto -mt-6 max-w-3xl space-y-5 px-5">
        {alerta && (
          <div role="alert" className="rounded-2xl border-2 border-late bg-late-soft p-5">
            <div className="flex items-center gap-2 text-lg font-extrabold text-late"><AlertTriangle /> Alerta: limite de atrasos atingido</div>
            <p className="mt-2"><b>{alerta.aluno}</b> · {alerta.turma} chegou a <b>{alerta.quantidade} atrasos</b> neste bimestre. A coordenação foi sinalizada para análise.</p>
            <div className="mt-3 flex gap-3">
              <Link to="/alunos/$id" params={{ id: alerta.alunoId }} className="rounded-xl bg-late px-4 py-2 font-bold text-primary-foreground">Ver histórico</Link>
              <button onClick={() => setAlerta(null)} className="rounded-xl border bg-card px-4 py-2 font-bold">Fechar</button>
            </div>
          </div>
        )}

        <Step n={1} title="Selecione a turma">
          <select value={turmaId} onChange={(e) => { setTurmaId(e.target.value); setAlunoId(""); }} className="w-full rounded-xl border bg-card px-4 py-4 text-lg">
            <option value="">Todas as turmas</option>
            {turmas?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </Step>

        <Step n={2} title="Pesquise e selecione o aluno">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite o código (ex.: 002) ou o nome" className="w-full rounded-xl border bg-card py-4 pl-12 pr-4 text-lg" />
          </div>
          <div className="mt-3 max-h-72 divide-y overflow-auto rounded-xl border bg-card">
            {lista.length === 0 && <p className="p-4 text-muted-foreground">Nenhum aluno encontrado.</p>}
            {lista.map((a) => (
              <button key={a.id} onClick={() => setAlunoId(a.id)} className={`flex w-full items-center justify-between px-4 py-3 text-left ${alunoId === a.id ? "bg-accent" : ""}`}>
                <span className="font-semibold"><span className="mr-2 font-mono text-muted-foreground">{a.codigo}</span>{a.nome}</span>
                <span className="text-sm text-muted-foreground">{nomeTurma(a.turma_id)}</span>
              </button>
            ))}
          </div>
        </Step>

        {aluno && (
          <>
            <Step n={3} title="Existe justificativa?">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setJust(false)} className={`rounded-xl border-2 p-4 text-lg font-bold ${just === false ? "border-late bg-late-soft text-late" : "bg-card"}`}>Não</button>
                <button onClick={() => setJust(true)} className={`rounded-xl border-2 p-4 text-lg font-bold ${just === true ? "border-justified bg-justified-soft text-justified" : "bg-card"}`}>Sim</button>
              </div>
            </Step>
            <Step n={4} title="Observação (opcional)">
              <input maxLength={200} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: ônibus atrasou" className="w-full rounded-xl border bg-card px-4 py-4 text-lg" />
            </Step>
            <button disabled={just === null || enviando} onClick={confirmar}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 text-xl font-extrabold text-primary-foreground disabled:opacity-40">
              <CheckCircle2 /> {enviando ? "Salvando…" : `Confirmar atraso de ${aluno.nome.split(" ")[0]}`}
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
      <h2 className="mb-3 flex items-center gap-3 text-lg font-bold">
        <span className="grid size-8 place-items-center rounded-full bg-navy text-sm text-navy-foreground">{n}</span>{title}
      </h2>
      {children}
    </section>
  );
}
