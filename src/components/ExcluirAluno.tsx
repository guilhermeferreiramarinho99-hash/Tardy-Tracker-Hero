import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { erroAmigavel, useMe } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";

export function ExcluirAluno({ aluno }: { aluno: { id: string; nome: string; codigo: string } }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  if (!me?.isAdmin) return null;

  async function excluir() {
    if (ocupado) return;
    setOcupado(true);
    setErro("");
    try {
      const { error } = await supabase.rpc("excluir_aluno", { _id: aluno.id });
      if (error) { setErro(erroAmigavel(error)); return; }
      setAberto(false);
      toast.success("Aluno excluído.");
      await qc.invalidateQueries({ queryKey: ["alunos"] });
    } catch (error) {
      setErro(erroAmigavel(error));
    } finally {
      setOcupado(false);
    }
  }

  return <AlertDialog open={aberto} onOpenChange={(value) => { if (!ocupado) { setAberto(value); setErro(""); } }}>
    <AlertDialogTrigger asChild>
      <Button variant="destructive" aria-label={`Excluir aluno ${aluno.nome}`}><Trash2 />Excluir</Button>
    </AlertDialogTrigger>
    <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
      <AlertDialogHeader>
        <AlertDialogTitle>Excluir aluno?</AlertDialogTitle>
        <AlertDialogDescription>
          {aluno.codigo} · {aluno.nome}. A exclusão é definitiva e só é permitida se não houver histórico de atrasos, alertas ou encaminhamentos. Se houver histórico, marque o aluno como Inativo em Administração → Alunos para preservar os registros.
        </AlertDialogDescription>
      </AlertDialogHeader>
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={ocupado}>Cancelar</AlertDialogCancel>
        <Button variant="destructive" disabled={ocupado} onClick={excluir}><Trash2 />{ocupado ? "Excluindo…" : "Excluir definitivamente"}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}