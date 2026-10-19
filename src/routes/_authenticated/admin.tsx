import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, SemPermissao } from "@/components/AppShell";
import { EscolaAdmin, TurmasAdmin } from "@/components/EscolaAdmin";
import { ImportarAlunos } from "@/components/ImportarAlunos";
import { pageHead } from "@/lib/page-head";
import { combinaBusca, erroAmigavel, fmtData, hojeISO, papelNome, useAlunos, useConfig, useMe, usePeriodos, useTurmas, type Papel } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => pageHead("Administração", "Administre os acessos, as turmas e as regras da sua escola no Pontual+."),
  component: Admin,
});

const abas = ["Escola", "Usuários", "Turmas", "Alunos", "Bimestres", "Regras", "Auditoria"] as const;
const input = "rounded-xl border bg-card px-3 py-3";

function Admin() {
  const { data: me } = useMe();
  const [aba, setAba] = useState<(typeof abas)[number]>("Usuários");
  if (me && !me.isAdmin) return <SemPermissao />;
  return (
    <>
      <PageHeader title="Administração" subtitle="Usuários, alunos, bimestres e regras" />
      <div className="mx-auto -mt-6 max-w-5xl space-y-5 px-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {abas.map((a) => (
            <button key={a} onClick={() => setAba(a)} className={`shrink-0 rounded-full border px-4 py-2 font-bold ${aba === a ? "bg-navy text-navy-foreground" : "bg-card"}`}>{a}</button>
          ))}
        </div>
        <section className="rounded-2xl border bg-card p-5">
          {aba === "Escola" && <EscolaAdmin />}
          {aba === "Turmas" && <TurmasAdmin />}
          {aba === "Usuários" && <Usuarios meuId={me?.id} />}
          {aba === "Alunos" && <AlunosAdmin />}
          {aba === "Bimestres" && <Bimestres />}
          {aba === "Regras" && <Regras />}
          {aba === "Auditoria" && <Auditoria />}
        </section>
      </div>
    </>
  );
}

function Usuarios({ meuId }: { meuId: string | undefined }) {
  const qc = useQueryClient();
  const { data: alunos } = useAlunos();
  const { data } = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: async () => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      if (p.error) throw p.error;
      return (p.data ?? []).map((u) => ({ ...u, roles: (r.data ?? []).filter((x) => x.user_id === u.id).map((x) => x.role as Papel) }));
    },
  });
  const alternar = async (uid: string, role: Papel, ativo: boolean) => {
    const { error } = await supabase.rpc("definir_papel", { _user: uid, _role: role, _ativo: ativo });
    if (error) { toast.error(erroAmigavel(error)); return; }
    qc.invalidateQueries();
  };
  const vincular = async (uid: string, alunoId: string) => {
    const { error } = await supabase.rpc("vincular_aluno", { _aluno: alunoId, _user: uid });
    if (error) { toast.error(erroAmigavel(error)); return; }
    toast.success("Conta vinculada ao aluno.");
    qc.invalidateQueries();
  };
  const salvarUsuario = async (uid: string, usuario: string) => {
    const { error } = await supabase.rpc("definir_usuario", { _user: uid, _usuario: usuario });
    if (error) { toast.error(erroAmigavel(error)); return; }
    toast.success("Nome de usuário salvo.");
    qc.invalidateQueries();
  };
  return (
    <div className="space-y-4">
      <Convites />
      <h2 className="border-t pt-5 font-bold">Pessoas autorizadas</h2>
      <ul className="divide-y">
        {data?.map((u) => (
          <li key={u.id} className="space-y-2 py-4">
            <div className="font-bold">{u.nome || "(sem nome)"} <span className="font-normal text-muted-foreground">· {u.email}</span></div>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = new FormData(e.currentTarget).get("usuario"); salvarUsuario(u.id, String(v ?? "")); }}>
              <input name="usuario" aria-label={`Nome de usuário de ${u.nome}`} defaultValue={u.usuario ?? ""} placeholder="Nome de usuário para entrar" className={`${input} flex-1 text-sm`} />
              <button className="rounded-xl border px-3 text-sm font-bold">Salvar</button>
            </form>
            <div className="flex flex-wrap gap-3">
              {(Object.keys(papelNome) as Papel[]).map((r) => (
                <label key={r} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold">
                  <input type="checkbox" className="size-4" checked={u.roles.includes(r)} disabled={r === "admin" && u.id === meuId}
                    onChange={(e) => alternar(u.id, r, e.target.checked)} /> {papelNome[r]}
                </label>
              ))}
            </div>
            {u.roles.includes("aluno") && (
              <select className={`${input} w-full text-sm`} value={alunos?.find((a) => a.user_id === u.id)?.id ?? ""} onChange={(e) => e.target.value && vincular(u.id, e.target.value)}>
                <option value="">Vincular a qual aluno?</option>
                {alunos?.map((a) => <option key={a.id} value={a.id}>{a.nome} ({a.codigo})</option>)}
              </select>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Convites() {
  const qc = useQueryClient();
  const [papel, setPapel] = useState<"equipe" | "coordenacao" | "aluno">("equipe");
  const [novo, setNovo] = useState<string>();
  const { data } = useQuery({ queryKey: ["convites"], queryFn: async () => {
    const r = await supabase.from("convites").select("*").order("criado_em", { ascending: false }).limit(30);
    if (r.error) throw r.error;
    return r.data;
  } });
  const gerar = async () => {
    const { data: c, error } = await supabase.rpc("gerar_convite", { _papel: papel });
    if (error) { toast.error(erroAmigavel(error)); return; }
    setNovo(c as string);
    qc.invalidateQueries({ queryKey: ["convites"] });
  };
  const revogar = async (id: string) => {
    if (!window.confirm("Revogar este convite?")) return;
    const { error } = await supabase.rpc("revogar_convite", { _id: id });
    if (error) { toast.error(erroAmigavel(error)); return; }
    qc.invalidateQueries({ queryKey: ["convites"] });
  };
  const situacao = (c: { usado_em: string | null; expira_em: string }) =>
    c.usado_em ? "Usado" : new Date(c.expira_em) < new Date() ? "Expirado ou revogado" : "Disponível";
  return (
    <div className="space-y-3">
      <h2 className="font-bold">Convidar funcionário ou aluno</h2>
      <p className="text-sm text-muted-foreground">Cada convite vale para uma única pessoa, por 7 dias, com o perfil escolhido.</p>
      <div className="flex flex-wrap gap-2">
        <select aria-label="Perfil do convite" value={papel} onChange={(e) => setPapel(e.target.value as typeof papel)} className={input}>
          <option value="equipe">Equipe escolar</option>
          <option value="coordenacao">Coordenação</option>
          <option value="aluno">Aluno</option>
        </select>
        <button onClick={gerar} className="rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground">Gerar convite</button>
      </div>
      {novo && (
        <div className="rounded-xl bg-ok-soft p-3 text-sm">
          <p className="font-bold">Convite criado. Envie à pessoa:</p>
          <p className="break-all font-mono text-base">{novo}</p>
          <p className="mt-1">Ela deve abrir a página de convite do Pontual+ e digitar o código.</p>
          <button className="mt-2 font-bold text-primary" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/convite?codigo=${novo}`).then(() => toast.success("Link copiado."))}>Copiar link do convite</button>
        </div>
      )}
      <ul className="divide-y text-sm">
        {data?.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 py-2">
            <span>{papelNome[c.papel as Papel] ?? c.papel} · <span className="font-mono">{c.codigo.slice(0, 6)}…</span> · {situacao(c)}</span>
            {situacao(c) === "Disponível" && <button onClick={() => revogar(c.id)} className="font-bold text-late">Revogar</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AlunosAdmin() {
  const qc = useQueryClient();
  const { data: alunos } = useAlunos();
  const { data: turmas } = useTurmas();
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [turma, setTurma] = useState("");
  const [busca, setBusca] = useState("");

  const salvarNovo = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("alunos").insert({ nome: nome.trim(), codigo: codigo.trim(), turma_id: turma });
    if (error) { toast.error(erroAmigavel(error)); return; }
    toast.success("Aluno cadastrado.");
    setNome(""); setCodigo("");
    qc.invalidateQueries({ queryKey: ["alunos"] });
  };
  const atualizar = async (id: string, campos: { nome?: string; turma_id?: string; ativo?: boolean }) => {
    const { error } = await supabase.from("alunos").update(campos).eq("id", id);
    if (error) { toast.error(erroAmigavel(error)); return; }
    toast.success("Cadastro atualizado.");
    qc.invalidateQueries({ queryKey: ["alunos"] });
  };
  const excluir = async (id: string, nomeAluno: string) => {
    if (!window.confirm(`Excluir definitivamente ${nomeAluno}? Isso só é possível se ele não tiver nenhum atraso registrado.`)) return;
    const { error } = await supabase.rpc("excluir_aluno", { _id: id });
    if (error) { toast.error(erroAmigavel(error)); return; }
    toast.success("Aluno excluído.");
    qc.invalidateQueries({ queryKey: ["alunos"] });
  };

  const exportar = () => {
    const lista = alunos ?? [];
    if (lista.length === 0) { toast.error("Nenhum aluno para exportar."); return; }
    const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const linhas = [
      ["Nome", "Código interno", "Turma", "Situação"].map(esc).join(";"),
      ...lista.map((a) =>
        [a.nome, a.codigo, turmas?.find((t) => t.id === a.turma_id)?.nome ?? "", a.ativo ? "Ativo" : "Inativo"].map(esc).join(";")
      ),
    ];
    const blob = new Blob(["\uFEFF" + linhas.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const aEl = document.createElement("a");
    aEl.href = url;
    aEl.download = `alunos-pontual-mais-${hojeISO()}.csv`;
    document.body.appendChild(aEl);
    aEl.click();
    aEl.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    toast.success("Lista de alunos exportada.");
  };

  return (
    <div className="space-y-5">
      <ImportarAlunos />
      <form onSubmit={salvarNovo} className="grid gap-2 sm:grid-cols-[1fr_2fr_1fr_auto]">
        <input required placeholder="Código (ex.: 002)" value={codigo} onChange={(e) => setCodigo(e.target.value)} className={input} />
        <input required placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} className={input} />
        <select required value={turma} onChange={(e) => setTurma(e.target.value)} className={input}>
          <option value="">Turma</option>
          {turmas?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <button className="rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground">Cadastrar</button>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        <input placeholder="Pesquisar por código ou nome" value={busca} onChange={(e) => setBusca(e.target.value)} className={`${input} min-w-48 flex-1`} />
        <button onClick={exportar} className="rounded-xl border px-4 py-3 font-bold">Exportar CSV</button>
      </div>
      <ul className="divide-y">
        {alunos?.filter((a) => combinaBusca(a, busca)).map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-2 py-3">
            <div className="min-w-48 flex-1"><div className="font-semibold">{a.nome}</div><div className="text-xs text-muted-foreground">{a.codigo}</div></div>
            <button className="text-sm font-semibold text-primary" onClick={() => { const n = window.prompt("Corrigir nome:", a.nome); if (n?.trim() && n.trim() !== a.nome) atualizar(a.id, { nome: n.trim() }); }}>Editar nome</button>
            <select value={a.turma_id} onChange={(e) => atualizar(a.id, { turma_id: e.target.value })} className={`${input} py-2 text-sm`}>
              {turmas?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
            <button onClick={() => atualizar(a.id, { ativo: !a.ativo })} className={`rounded-lg px-3 py-2 text-sm font-bold ${a.ativo ? "bg-ok-soft text-ok" : "bg-muted text-muted-foreground"}`}>{a.ativo ? "Ativo" : "Inativo"}</button>
            <button onClick={() => excluir(a.id, a.nome)} className="rounded-lg bg-late-soft px-3 py-2 text-sm font-bold text-late">Excluir</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Bimestres() {
  const qc = useQueryClient();
  const { data: periodos } = usePeriodos();
  const [n, setN] = useState({ nome: "", inicio: "", fim: "" });
  const salvar = async (id: string | null, v: { nome: string; inicio: string; fim: string }) => {
    if (!v.nome || !v.inicio || !v.fim || v.fim < v.inicio) { toast.error("Preencha nome, início e fim (fim depois do início)."); return; }
    const sobrepoe = periodos?.some((p) => p.id !== id && v.inicio <= p.fim && v.fim >= p.inicio);
    if (sobrepoe) { toast.error("As datas se sobrepõem a outro bimestre."); return; }
    const { error } = id ? await supabase.from("periodos").update(v).eq("id", id) : await supabase.from("periodos").insert(v);
    if (error) { toast.error(erroAmigavel(error)); return; }
    toast.success("Bimestre salvo. Os registros antigos continuam guardados.");
    setN({ nome: "", inicio: "", fim: "" });
    qc.invalidateQueries({ queryKey: ["periodos"] });
  };
  const excluir = async (id: string, nome: string) => {
    if (!window.confirm(`Excluir o bimestre "${nome}"? Os atrasos registrados continuam guardados no histórico.`)) return;
    const { error } = await supabase.rpc("excluir_periodo", { _id: id });
    if (error) { toast.error(erroAmigavel(error)); return; }
    toast.success("Bimestre excluído.");
    qc.invalidateQueries({ queryKey: ["periodos"] });
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Use as datas do calendário oficial da escola. Os bimestres podem ter durações diferentes.</p>
      {periodos?.map((p) => <LinhaPeriodo key={p.id} p={p} onSave={(v) => salvar(p.id, v)} onDelete={() => excluir(p.id, p.nome)} />)}
      <div className="border-t pt-4">
        <div className="mb-2 font-bold">Novo bimestre</div>
        <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <input placeholder="Ex.: 1º bimestre 2027" value={n.nome} onChange={(e) => setN({ ...n, nome: e.target.value })} className={input} />
          <input type="date" value={n.inicio} onChange={(e) => setN({ ...n, inicio: e.target.value })} className={input} />
          <input type="date" value={n.fim} onChange={(e) => setN({ ...n, fim: e.target.value })} className={input} />
          <button onClick={() => salvar(null, n)} className="rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground">Adicionar</button>
        </div>
      </div>
    </div>
  );
}

function LinhaPeriodo({ p, onSave, onDelete }: { p: { nome: string; inicio: string; fim: string }; onSave: (v: { nome: string; inicio: string; fim: string }) => void; onDelete: () => void }) {
  const [v, setV] = useState({ nome: p.nome, inicio: p.inicio, fim: p.fim });
  const mudou = v.nome !== p.nome || v.inicio !== p.inicio || v.fim !== p.fim;
  return (
    <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto_auto]">
      <input value={v.nome} onChange={(e) => setV({ ...v, nome: e.target.value })} className={input} />
      <input type="date" value={v.inicio} onChange={(e) => setV({ ...v, inicio: e.target.value })} className={input} />
      <input type="date" value={v.fim} onChange={(e) => setV({ ...v, fim: e.target.value })} className={input} />
      <button disabled={!mudou} onClick={() => onSave(v)} className="rounded-xl border px-4 py-3 font-bold disabled:opacity-40">Salvar</button>
      <button onClick={onDelete} className="rounded-xl bg-late-soft px-4 py-3 font-bold text-late">Excluir</button>
    </div>
  );
}

function Regras() {
  const qc = useQueryClient();
  const { data: c } = useConfig();
  const [limite, setLimite] = useState<number>();
  const [contar, setContar] = useState<boolean>();
  if (!c) return null;
  const l = limite ?? c.limite;
  const j = contar ?? c.contar_justificados;
  const salvar = async () => {
    const { error } = await supabase.from("escola_config").update({ limite: l, contar_justificados: j }).eq("escola_id", c.escola_id);
    if (error) { toast.error(erroAmigavel(error)); return; }
    toast.success("Regras salvas.");
    qc.invalidateQueries({ queryKey: ["config"] });
  };
  return (
    <div className="max-w-md space-y-4">
      <p className="text-sm text-muted-foreground">O alerta serve apenas para análise humana pela coordenação. Nenhuma punição é aplicada automaticamente.</p>
      <label className="block font-semibold">Gerar alerta ao atingir quantos atrasos no mesmo bimestre?
        <input type="number" min={1} max={50} value={l} onChange={(e) => setLimite(Number(e.target.value))} className={`${input} mt-2 block w-32`} />
      </label>
      <label className="flex items-center gap-3 font-semibold">
        <input type="checkbox" className="size-5" checked={j} onChange={(e) => setContar(e.target.checked)} /> Contar atrasos justificados para o alerta
      </label>
      <button onClick={salvar} className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">Salvar regras</button>
    </div>
  );
}

function Auditoria() {
  const { data } = useQuery({
    queryKey: ["auditoria"],
    queryFn: async () => {
      const r = await supabase.from("auditoria").select("*").order("quando", { ascending: false }).limit(200);
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const resumo = (d: unknown) => {
    const o = (d ?? {}) as Record<string, unknown>;
    return ["aluno", "usuario", "perfil", "motivo"].filter((k) => o[k] != null).map((k) => `${k}: ${String(o[k])}`).join(" · ");
  };
  return (
    <ul className="divide-y text-sm">
      {data?.length === 0 && <li className="py-2 text-muted-foreground">Nenhuma operação registrada ainda.</li>}
      {data?.map((x) => (
        <li key={x.id} className="py-2">
          <b>{fmtData(x.quando)} {new Date(x.quando).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</b> · {x.usuario_nome}
          <div>{x.operacao}</div>
          <div className="text-xs text-muted-foreground">{resumo(x.detalhes)}</div>
        </li>
      ))}
    </ul>
  );
}
