import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { nomeEscola } from "@/lib/escola";

export const Route = createFileRoute("/cadastrar-escola")({
  beforeLoad: () => { throw redirect({ to: "/auth", replace: true }); },
  head: () => ({ meta: [
    { title: "Acesso da escola — Pontual+" },
    { name: "description", content: `Acesso exclusivo da ${nomeEscola}.` },
    { property: "og:title", content: "Acesso da escola — Pontual+" },
    { property: "og:description", content: `Acesso exclusivo da ${nomeEscola}.` },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: CadastroEncerrado,
});

function CadastroEncerrado() {
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-6 py-10">
    <h1 className="text-2xl font-extrabold">{nomeEscola}</h1>
    <p className="text-muted-foreground">O Pontual+ é de uso exclusivo desta escola. Para obter acesso, peça um convite à administração.</p>
    <Button asChild className="h-12"><Link to="/auth">Entrar</Link></Button>
    <Button asChild variant="outline" className="h-12"><Link to="/convite">Recebi um convite</Link></Button>
  </main>;
}
