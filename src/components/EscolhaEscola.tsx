import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { erroAmigavel } from "@/lib/api";

export function EscolhaEscola({ sair }: { sair: () => Promise<void> }) {
  const qc = useQueryClient();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [valor, setValor] = useState("");
  const [enviando, setEnviando] = useState(false);
  const enviar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (enviando) return;
    setEnviando(true);
    try {
      const { error } = modo === "criar"
        ? await supabase.rpc("criar_escola", { _nome: valor.trim() })
        : await supabase.rpc("entrar_escola", { _codigo: valor.trim() });
      if (error) throw error;
      await qc.cancelQueries();
      qc.removeQueries({ predicate: (query) => query.queryKey[0] !== "me" });
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast.success(modo === "criar" ? "Escola cadastrada. Você é o administrador." : "Solicitação enviada à administração da escola.");
    } catch (error) { toast.error(erroAmigavel(error)); }
    finally { setEnviando(false); }
  };
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-10">
      <Building2 className="size-12 text-primary" />
      <h1 className="text-3xl font-extrabold">Sua escola</h1>
      <div className="grid grid-cols-2 gap-2">
        <Button variant={modo === "entrar" ? "default" : "outline"} onClick={() => { setModo("entrar"); setValor(""); }}>Entrar na escola</Button>
        <Button variant={modo === "criar" ? "default" : "outline"} onClick={() => { setModo("criar"); setValor(""); }}>Cadastrar escola</Button>
      </div>
      <form onSubmit={enviar} className="space-y-4">
        <label className="block font-semibold">{modo === "criar" ? "Nome da escola" : "Código fornecido pela escola"}
          <input required minLength={modo === "criar" ? 3 : 32} maxLength={modo === "criar" ? 120 : 32} value={valor} onChange={(e) => setValor(e.target.value)} className="mt-2 w-full rounded-lg border bg-card px-4 py-4" autoComplete="off" />
        </label>
        <Button disabled={enviando} className="h-12 w-full">{enviando ? "Aguarde…" : modo === "criar" ? "Cadastrar minha escola" : "Solicitar acesso"}</Button>
      </form>
      <Button variant="ghost" onClick={sair}><LogOut /> Sair da conta</Button>
    </main>
  );
}