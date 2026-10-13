import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Clock, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pontual+ — Registro de atrasos escolares" },
      { name: "description", content: "Pontual+: registro digital de atrasos de alunos e acompanhamento pela coordenação." },
      { property: "og:title", content: "Pontual+ — Registro de atrasos escolares" },
      { property: "og:description", content: "Registro digital de atrasos e alertas para a coordenação escolar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Inicio,
});

function Inicio() {
  return (
    <div className="flex min-h-screen flex-col bg-hero text-navy-foreground">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-12">
        <div>
          <div className="text-5xl font-extrabold">Pontual<span className="text-justified">+</span></div>
          <p className="mt-3 text-lg opacity-85">Registro digital de atrasos para a equipe escolar e a coordenação.</p>
        </div>
        <ul className="space-y-3 text-base">
          <li className="flex gap-3"><Clock className="shrink-0" /> Registro rápido com data e hora automáticas</li>
          <li className="flex gap-3"><CalendarDays className="shrink-0" /> Histórico por bimestre e calendário</li>
          <li className="flex gap-3"><ShieldCheck className="shrink-0" /> Acesso individual e protegido por perfil</li>
        </ul>
        <Link to="/auth" className="rounded-2xl bg-card py-4 text-center text-lg font-extrabold text-primary">Entrar</Link>
      </div>
    </div>
  );
}
