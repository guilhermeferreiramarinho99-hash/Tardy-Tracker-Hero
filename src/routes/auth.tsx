import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Pontual+" },
      { name: "description", content: "Acesse o Pontual+ com sua conta individual." },
      { property: "og:title", content: "Entrar — Pontual+" },
      { property: "og:description", content: "Acesse o Pontual+ com sua conta individual." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "criar" | "esqueci">("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: "/inicio", replace: true }); });
    const { data } = supabase.auth.onAuthStateChange((e, s) => { if (e === "SIGNED_IN" && s) navigate({ to: "/inicio", replace: true }); });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setEnviando(true);
    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw new Error("E-mail ou senha incorretos, ou e-mail ainda não confirmado.");
      } else if (modo === "criar") {
        const { error } = await supabase.auth.signUp({ email, password: senha, options: { emailRedirectTo: window.location.origin + "/auth", data: { nome } } });
        if (error) throw error;
        toast.success("Conta criada! Abra seu e-mail e clique no link de confirmação.");
        setModo("entrar");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
        if (error) throw error;
        toast.success("Se o e-mail estiver cadastrado, você receberá um link para criar nova senha.");
        setModo("entrar");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Não foi possível entrar com o Google.");
  };

  const input = "w-full rounded-xl border bg-card px-4 py-4 text-lg";
  return (
    <div className="flex min-h-screen flex-col bg-hero">
      <div className="px-6 pb-10 pt-14 text-center text-navy-foreground">
        <div className="text-4xl font-extrabold">Pontual<span className="text-justified">+</span></div>
        <p className="mt-2 opacity-80">Registro de atrasos escolares</p>
      </div>
      <div className="flex-1 rounded-t-3xl bg-background px-6 py-8">
        <form onSubmit={enviar} className="mx-auto max-w-sm space-y-4">
          <h1 className="text-2xl font-extrabold">{modo === "entrar" ? "Entrar" : modo === "criar" ? "Criar conta" : "Recuperar senha"}</h1>
          {modo === "criar" && <input required placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} className={input} />}
          <input required type="email" placeholder="E-mail" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
          {modo !== "esqueci" && <input required type="password" minLength={8} placeholder="Senha (mínimo 8 caracteres)" autoComplete={modo === "entrar" ? "current-password" : "new-password"} value={senha} onChange={(e) => setSenha(e.target.value)} className={input} />}
          <button disabled={enviando} className="w-full rounded-xl bg-primary py-4 text-lg font-extrabold text-primary-foreground disabled:opacity-50">
            {modo === "entrar" ? "Entrar" : modo === "criar" ? "Criar conta" : "Enviar link"}
          </button>
          {modo !== "esqueci" && (
            <button type="button" onClick={google} className="w-full rounded-xl border bg-card py-4 text-lg font-bold">Continuar com Google</button>
          )}
          <div className="flex flex-col gap-2 pt-2 text-center font-semibold text-primary">
            {modo !== "entrar" && <button type="button" onClick={() => setModo("entrar")}>Já tenho conta — entrar</button>}
            {modo === "entrar" && <button type="button" onClick={() => setModo("criar")}>Criar uma conta</button>}
            {modo === "entrar" && <button type="button" onClick={() => setModo("esqueci")}>Esqueci minha senha</button>}
          </div>
          <p className="pt-4 text-center text-xs text-muted-foreground">Conta individual · acesso restrito à sua escola.</p>
        </form>
      </div>
    </div>
  );
}
