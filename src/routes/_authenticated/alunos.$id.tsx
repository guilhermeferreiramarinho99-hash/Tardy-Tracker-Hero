import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Historico } from "@/components/Historico";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/alunos/$id")({
  head: () => pageHead("Histórico do aluno", "Histórico e calendário de atrasos do aluno, com acesso autorizado no Pontual+."),
  component: Pagina,
});

function Pagina() {
  const { id } = Route.useParams();
  return (
    <Historico alunoId={id} voltar={
      <Link to="/alunos" className="no-print mt-3 inline-flex items-center gap-1 text-sm font-semibold opacity-80"><ArrowLeft className="size-4" /> Voltar</Link>
    } />
  );
}
