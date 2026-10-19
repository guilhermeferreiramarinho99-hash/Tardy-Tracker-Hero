import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, RefreshCw, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { erroAmigavel, useMe, useTurmas } from "@/lib/api";

export function EscolaAdmin() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [nome, setNome] = useState<string>();
  const [ocupado, setOcupado] = useState(false);
  const { data: convite } = useQuery({ queryKey: ["escola-convite"], queryFn: async () => {
    const { data, error } = await supabase.from("escola_convites").select("codigo").single();
    if (error) throw error;
    return data;
  } });
  const salvar = async (renovar = false) => {
    if (!me?.escola || ocupado) return;
    if (renovar && !window.confirm("Gerar outro código? O código anterior deixará de aceitar novas solicitações.")) return;
    setOcupado(true);
    const { error } = await supabase.rpc("atualizar_escola", { _nome: nome ?? me.escola.nome, _renovar_codigo: renovar });
    setOcupado(false);
    if (error) { toast.error(erroAmigavel(error)); return; }
    await qc.invalidateQueries();
    toast.success(renovar ? "Novo código gerado." : "Nome da escola atualizado.");
  };
  return <div className="space-y-5">
    <label className="block font-semibold">Nome da escola
      <input aria-label="Nome da escola" minLength={3} maxLength={120} value={nome ?? me?.escola?.nome ?? ""} onChange={(e) => setNome(e.target.value)} className="mt-2 w-full rounded-lg border bg-card px-3 py-3" />
    </label>
    <Button disabled={ocupado} onClick={() => salvar()}>Salvar nome</Button>
    <div className="space-y-3 border-t pt-5">
      <h2 className="font-bold">Código da escola</h2>
      <p className="break-all rounded-lg bg-muted p-3 font-mono text-sm" aria-label="Código da escola">{convite?.codigo ?? "Carregando…"}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={!convite} onClick={async () => {
          if (!convite) return;
          try { await navigator.clipboard.writeText(convite.codigo); toast.success("Código copiado."); }
          catch { toast.error("Não foi possível copiar. Selecione o código para copiá-lo."); }
        }}><Copy /> Copiar código</Button>
        <Button variant="outline" disabled={ocupado} onClick={() => salvar(true)}><RefreshCw /> Renovar código</Button>
      </div>
    </div>
    <ExcluirEscola />
  </div>;
}

export function TurmasAdmin() {
  const qc = useQueryClient();
  const { data: turmas } = useTurmas();
  const [ano, setAno] = useState("6º ano");
  const [nome, setNome] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const cadastrar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (ocupado) return;
    setOcupado(true);
    const { error } = await supabase.from("turmas").insert({ ano, nome: nome.trim(), ordem: (turmas?.length ?? 0) + 1 });
    setOcupado(false);
    if (error) { toast.error(erroAmigavel(error)); return; }
    setNome("");
    await qc.invalidateQueries({ queryKey: ["turmas"] });
    toast.success("Turma cadastrada.");
  };
  const [lote, setLote] = useState("");
  const anoDe = (n: string) => {
    const m = n.match(/^\s*(\d)/);
    if (!m) return ano;
    const d = Number(m[1]);
    if (/m[ée]dio|EM|s[ée]rie/i.test(n) && d <= 3) return `${d}ª série EM`;
    return d >= 6 && d <= 9 ? `${d}º ano` : ano;
  };
  const cadastrarLote = async () => {
    const existentes = new Set((turmas ?? []).map((t) => t.nome.trim().toLowerCase()));
    const nomes = [...new Set(lote.split(/[\n,;]/).map((s) => s.trim()).filter(Boolean))].filter((n) => !existentes.has(n.toLowerCase()));
    if (nomes.length === 0) { toast.error("Nenhuma turma nova para cadastrar."); return; }
    setOcupado(true);
    const base = turmas?.length ?? 0;
    const { error } = await supabase.from("turmas").insert(nomes.map((n, i) => ({ nome: n.slice(0, 80), ano: anoDe(n), ordem: base + i + 1 })));
    setOcupado(false);
    if (error) { toast.error(erroAmigavel(error)); return; }
    setLote("");
    await qc.invalidateQueries({ queryKey: ["turmas"] });
    toast.success(`${nomes.length} turma(s) cadastrada(s).`);
  };
  const excluirTurma = async (id: string, n: string) => {
    if (!window.confirm(`Excluir a turma ${n}? Só é possível se não houver alunos nela.`)) return;
    const { error } = await supabase.from("turmas").delete().eq("id", id);
    if (error) { toast.error(error.code === "23503" ? "Esta turma tem alunos. Mova ou exclua os alunos antes." : erroAmigavel(error)); return; }
    await qc.invalidateQueries({ queryKey: ["turmas"] });
    toast.success("Turma excluída.");
  };
  return <div className="space-y-5">
    <div className="space-y-2 rounded-2xl border-2 border-dashed p-4">
      <h2 className="font-bold">Cadastrar várias turmas de uma vez</h2>
      <p className="text-sm text-muted-foreground">Escreva uma turma por linha (ou separadas por vírgula).</p>
      <textarea aria-label="Várias turmas" rows={4} value={lote} onChange={(e) => setLote(e.target.value)} placeholder={"6º ano A\n6º ano B\n1ª série EM A"} className="w-full rounded-lg border bg-card px-3 py-3" />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" type="button" onClick={() => setLote(["6º ano", "7º ano", "8º ano", "9º ano", "1ª série EM", "2ª série EM", "3ª série EM"].flatMap((a) => [`${a} A`, `${a} B`]).join("\n"))}>Preencher do 6º ano ao 3º EM (A e B)</Button>
        <Button type="button" disabled={ocupado} onClick={cadastrarLote}><Plus /> Cadastrar todas</Button>
      </div>
    </div>
    <form onSubmit={cadastrar} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
      <label className="text-sm font-semibold">Ano
        <select aria-label="Ano da turma" value={ano} onChange={(e) => setAno(e.target.value)} className="mt-1 w-full rounded-lg border bg-card px-3 py-3">
          {["6º ano", "7º ano", "8º ano", "9º ano", "1ª série EM", "2ª série EM", "3ª série EM"].map((a) => <option key={a}>{a}</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold">Nome da turma
        <input aria-label="Nome da turma" required maxLength={80} placeholder="Ex.: 6º ano A" value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1 w-full rounded-lg border bg-card px-3 py-3" />
      </label>
      <Button className="h-12 self-end" disabled={ocupado}><Plus /> Cadastrar turma</Button>
    </form>
    <ul className="divide-y">{turmas?.map((t) => <li key={t.id} className="flex items-center justify-between gap-2 py-3"><span><b>{t.nome}</b><span className="ml-3 text-sm text-muted-foreground">{t.ano}</span></span><button onClick={() => excluirTurma(t.id, t.nome)} className="rounded-lg bg-late-soft px-3 py-2 text-sm font-bold text-late">Excluir</button></li>)}</ul>
  </div>;
}

export function ExcluirEscola() {
  const { data: me } = useMe();
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const excluir = async () => {
    if (!me?.escola) return;
    if (!window.confirm("ATENÇÃO: isso apaga a escola e TODOS os alunos, turmas, bimestres e atrasos dela. Não há como desfazer. Continuar?")) return;
    setOcupado(true);
    const { error } = await supabase.rpc("excluir_escola", { _confirmacao: texto });
    setOcupado(false);
    if (error) { toast.error(erroAmigavel(error)); return; }
    toast.success("Escola excluída.");
    window.location.href = "/";
  };
  return <div className="space-y-3 rounded-2xl border-2 border-late p-4">
    <h2 className="font-bold text-late">Excluir esta escola</h2>
    <p className="text-sm">Apaga definitivamente a escola e todos os dados dela. Para confirmar, digite o nome: <b>{me?.escola?.nome}</b></p>
    <input aria-label="Confirmar nome da escola" value={texto} onChange={(e) => setTexto(e.target.value)} className="w-full rounded-lg border bg-card px-3 py-3" />
    <Button variant="destructive" disabled={ocupado || texto.trim() !== (me?.escola?.nome ?? "").trim()} onClick={excluir}>Excluir escola definitivamente</Button>
  </div>;
}