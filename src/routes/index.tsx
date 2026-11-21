import { createFileRoute } from "@tanstack/react-router";
import { Auth } from "@/routes/auth";
import { nomeEscola } from "@/lib/escola";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `Pontual+ — ${nomeEscola}` },
      { name: "description", content: `Acesso escolar ao Pontual+ da ${nomeEscola}.` },
      { property: "og:title", content: `Pontual+ — ${nomeEscola}` },
      { property: "og:description", content: `Acesso protegido aos registros de atrasos da ${nomeEscola}.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Auth,
});
