import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, LogOut, Ticket } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { erroAmigavel, type Rascunho } from "@/lib/api";
import { aplicarRascunho } from "@/lib/cadastro";

export function EscolhaEscola({ sair, rascunho }: { sair: () => Promise<void>; rascunho: Rascunho | null }) {
  const qc = useQueryClient();
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const feito = useRef(false);

  const aplicar = async (r: Rascunho) => {
    setEnviando(true);
    try {
      await aplicarRascunho(r);
      toast.success(r.tipo === "escola" ? "Escola cadastrada. Aguarde a verificação." : "Convite aceito. Bem-vindo(a)!");
    } catch (e) { toast.error(erroAmigavel(e)); }
    finally {
      setEnviando(false);
      await qc.invalidateQueries();
    }
  };

  useEffect(() => {
    if (rascunho && !feito.current) { feito.current = true; void aplicar(rascunho); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rascunho]);

  if (rascunho && enviando) return <div className="grid min-h-screen place-items-center text-muted-foreground">Preparando seu acesso…</div>;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-10">
      <Building2 className="size-12 text-primary" />
      <h1 className="text-3xl font-extrabold">Sua escola</h1>
      <p className="text-muted-foreground">Sua conta ainda não está ligada a nenhuma escola.</p>
      <form onSubmit={(e) => { e.preventDefault(); void aplicar({ tipo: "convite", codigo }); }} className="space-y-3 rounded-2xl border bg-card p-4">
        <label className="block font-semibold"><Ticket className="mr-1 inline size-5" /> Código do convite
          <input required aria-label="Código do convite" value={codigo} onChange={(e) => setCodigo(e.target.value)} className="mt-2 w-full rounded-lg border bg-background px-4 py-4 font-mono" autoComplete="off" />
        </label>
        <Button disabled={enviando} className="h-12 w-full">Usar convite</Button>
      </form>
      <p className="text-center text-sm">É responsável por uma escola? Saia e use <Link to="/cadastrar-escola" className="font-bold text-primary">Cadastrar minha escola</Link> com outro e-mail.</p>
      <Button variant="ghost" onClick={sair}><LogOut /> Sair da conta</Button>
    </main>
  );
}
