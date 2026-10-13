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
  return <div className="space-y-5">
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
    <ul className="divide-y">{turmas?.map((t) => <li key={t.id} className="py-3"><b>{t.nome}</b><span className="ml-3 text-sm text-muted-foreground">{t.ano}</span></li>)}</ul>
  </div>;
}