import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { criarConta } from "@/lib/cadastro";
import { erroAmigavel } from "@/lib/api";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/cadastrar-escola")({
  head: () => ({
    meta: [
      { title: "Cadastrar escola — Pontual+" },
      { name: "description", content: "Cadastre sua escola no Pontual+. O acesso é liberado após verificação." },
      { property: "og:title", content: "Cadastrar escola — Pontual+" },
      { property: "og:description", content: "Cadastre sua escola no Pontual+. O acesso é liberado após verificação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Cadastro,
});

const vazio = { nome: "", email_institucional: "", endereco: "", cidade: "", estado: "", cep: "", telefone: "", resp: "", email: "", senha: "" };

function Cadastro() {
  const navigate = useNavigate();
  const [f, setF] = useState(vazio);
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof vazio) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const r = await criarConta(f.resp, f.email, f.senha, {
        tipo: "escola", nome: f.nome.trim(), email_institucional: f.email_institucional.trim(), endereco: f.endereco.trim(),
        cidade: f.cidade.trim(), estado: f.estado.trim().toUpperCase(), cep: f.cep.trim(), telefone: f.telefone.trim(),
      });
      if (r.logado) navigate({ to: "/inicio" });
    } catch (err) { toast.error(erroAmigavel(err)); } finally { setEnviando(false); }
  };
  const input = "mt-1 w-full rounded-xl border bg-card px-4 py-3 text-base";
  const campo = (k: keyof typeof vazio, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block text-sm font-semibold">{label}<input aria-label={label} value={f[k]} onChange={set(k)} className={input} {...extra} /></label>
  );
  return (
    <main className="mx-auto max-w-lg space-y-5 px-6 py-10">
      <Link to="/" className="flex items-center gap-2 font-extrabold text-primary"><img src={logo} alt="" className="size-10" /> Pontual+</Link>
      {(
        <form onSubmit={enviar} className="space-y-4">
          <h1 className="text-2xl font-extrabold">Cadastrar escola</h1>
          <p className="text-muted-foreground">O cadastro passa por verificação antes de liberar o acesso.</p>
          <fieldset className="space-y-3 rounded-2xl border p-4">
            <legend className="px-1 font-bold">Dados da escola</legend>
            {campo("nome", "Nome oficial da escola", { required: true, minLength: 3, maxLength: 120 })}
            {campo("email_institucional", "E-mail institucional", { required: true, type: "email" })}
            {campo("endereco", "Endereço", { required: true })}
            <div className="grid grid-cols-[1fr_5rem] gap-3">
              {campo("cidade", "Cidade", { required: true })}
              {campo("estado", "UF", { required: true, minLength: 2, maxLength: 2, placeholder: "SP" })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {campo("cep", "CEP", { required: true, inputMode: "numeric" })}
              {campo("telefone", "Telefone", { required: true, type: "tel" })}
            </div>
          </fieldset>
          <fieldset className="space-y-3 rounded-2xl border p-4">
            <legend className="px-1 font-bold">Responsável (será o administrador)</legend>
            {campo("resp", "Nome completo", { required: true })}
            {campo("email", "Seu e-mail", { required: true, type: "email", autoComplete: "email" })}
            {campo("senha", "Crie sua senha (mínimo 8)", { required: true, type: "password", minLength: 8, autoComplete: "new-password" })}
          </fieldset>
          <button disabled={enviando} className="w-full rounded-xl bg-primary py-4 text-lg font-extrabold text-primary-foreground disabled:opacity-50">{enviando ? "Aguarde…" : "Enviar cadastro"}</button>
        </form>
      )}
    </main>
  );
}
