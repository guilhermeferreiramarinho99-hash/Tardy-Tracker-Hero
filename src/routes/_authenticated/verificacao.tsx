import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, SemPermissao } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/page-head";
import { erroAmigavel, fmtData, useMe } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/verificacao")({
  head: () => pageHead("Verificação de escolas", "Aprovação de novas escolas no Pontual+."),
  component: Verificacao,
});

function Verificacao() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["pendentes"],
    enabled: !!me?.ehSuperadmin,
    queryFn: async () => {
      const r = await supabase.rpc("listar_escolas_pendentes");
      if (r.error) throw r.error;
      return r.data ?? [];
    },
  });
  if (!me?.ehSuperadmin) return <SemPermissao />;
  const decidir = async (id: string, aprovar: boolean) => {
    if (!aprovar && !confirm("Recusar esta escola?")) return;
    const { error } = await supabase.rpc("verificar_escola", { _escola: id, _aprovar: aprovar });
    if (error) toast.error(erroAmigavel(error));
    else toast.success(aprovar ? "Escola aprovada. O responsável já pode entrar." : "Escola recusada.");
    await qc.invalidateQueries({ queryKey: ["pendentes"] });
  };
  return (
    <>
      <PageHeader title="Verificação de escolas" subtitle="Somente você vê esta tela." />
      <div className="mx-auto -mt-6 max-w-3xl space-y-4 px-5">
        {q.isLoading && <p className="text-muted-foreground">Carregando…</p>}
        {q.data?.length === 0 && <div className="rounded-2xl border bg-card p-6 text-center text-muted-foreground">Nenhuma escola aguardando verificação.</div>}
        {q.data?.map((e) => (
          <div key={e.escola_id} className="space-y-2 rounded-2xl border bg-card p-5">
            <h2 className="text-xl font-extrabold">{e.nome}</h2>
            <p className="text-sm">{e.endereco} — {e.cidade}/{e.estado} — CEP {e.cep}</p>
            <p className="text-sm">{e.email_institucional} · {e.telefone}</p>
            <p className="text-sm"><b>Responsável:</b> {e.responsavel} ({e.responsavel_email})</p>
            <p className="text-xs text-muted-foreground">Cadastrada em {fmtData(e.criado_em)}</p>
            <div className="flex gap-2 pt-2">
              <Button className="h-12 flex-1" onClick={() => decidir(e.escola_id, true)}>Aprovar</Button>
              <Button variant="outline" className="h-12 flex-1" onClick={() => decidir(e.escola_id, false)}>Recusar</Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
