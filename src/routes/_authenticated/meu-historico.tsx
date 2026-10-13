import { createFileRoute } from "@tanstack/react-router";
import { Historico } from "@/components/Historico";
import { pageHead } from "@/lib/page-head";
import { useAlunos, useMe } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/meu-historico")({
  head: () => pageHead("Meu histórico", "Consulta individual dos seus atrasos e calendário no Pontual+."),
  component: Meu,
});

function Meu() {
  const { data: me } = useMe();
  const { data: alunos, isLoading } = useAlunos();
  if (isLoading || !me) return <div className="p-8 text-muted-foreground">Carregando…</div>;
  const meu = alunos?.find((a) => a.user_id === me.id);
  if (!meu) return <div className="p-8 text-center text-muted-foreground">Sua conta ainda não está vinculada a um cadastro de aluno. Procure a secretaria da escola.</div>;
  return <Historico alunoId={meu.id} />;
}
