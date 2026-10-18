import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { criarConta } from "@/lib/cadastro";
import { erroAmigavel } from "@/lib/api";

export const Route = createFileRoute("/convite")({
  validateSearch: (s: Record<string, unknown>): { codigo?: string } => (typeof s["codigo"] === "string" ? { codigo: s["codigo"] } : {}),
  head: () => ({
    meta: [
      { title: "Aceitar convite — Pontual+" },
      { name: "description", content: "Crie sua conta no Pontual+ com o convite enviado pela sua escola." },
      { property: "og:title", content: "Aceitar convite — Pontual+" },
      { property: "og:description", content: "Crie sua conta no Pontual+ com o convite enviado pela sua escola." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Convite,
});

function Convite() {
  const { codigo: inicial } = Route.useSearch();
  const navigate = useNavigate();
  const [f, setF] = useState({ codigo: inicial ?? "", nome: "", email: "", senha: "" });
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const r = await criarConta(f.nome, f.email, f.senha, { tipo: "convite", codigo: f.codigo.trim() });
      if (r.logado) navigate({ to: "/inicio" }); else setPronto(true);
    } catch (err) { toast.error(erroAmigavel(err)); } finally { setEnviando(false); }
  };
  const input = "w-full rounded-xl border bg-card px-4 py-4 text-lg";
  return (
    <main className="mx-auto max-w-sm space-y-5 px-6 py-10">
      <Link to="/" className="font-extrabold text-primary">← Pontual+</Link>
      {pronto ? (
        <div className="space-y-3 text-center">
          <MailCheck className="mx-auto size-12 text-ok" />
          <h1 className="text-2xl font-extrabold">Confirme seu e-mail</h1>
          <p>Enviamos um link para <b>{f.email}</b>. Depois de confirmar, entre no Pontual+ e o convite será usado automaticamente.</p>
          <Link to="/auth" className="block rounded-xl bg-primary py-4 font-extrabold text-primary-foreground">Ir para entrar</Link>
        </div>
      ) : (
        <form onSubmit={enviar} className="space-y-4">
          <h1 className="text-2xl font-extrabold">Aceitar convite</h1>
          <p className="text-muted-foreground">Use o código que a administração da escola enviou e crie sua própria senha.</p>
          <input required aria-label="Código do convite" placeholder="Código do convite" value={f.codigo} onChange={set("codigo")} className={`${input} font-mono`} autoComplete="off" />
          <input required aria-label="Nome completo" placeholder="Nome completo" value={f.nome} onChange={set("nome")} className={input} />
          <input required type="email" aria-label="E-mail" placeholder="E-mail" value={f.email} onChange={set("email")} className={input} autoComplete="email" />
          <input required type="password" minLength={8} aria-label="Crie sua senha" placeholder="Crie sua senha (mínimo 8)" value={f.senha} onChange={set("senha")} className={input} autoComplete="new-password" />
          <button disabled={enviando} className="w-full rounded-xl bg-primary py-4 text-lg font-extrabold text-primary-foreground disabled:opacity-50">{enviando ? "Aguarde…" : "Criar minha conta"}</button>
          <p className="text-center text-sm">Já tem conta? <Link to="/auth" className="font-bold text-primary">Entrar</Link></p>
        </form>
      )}
    </main>
  );
}
