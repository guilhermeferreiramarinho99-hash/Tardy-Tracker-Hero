import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Pontual+" },
      { name: "description", content: "Acesse o Pontual+ com seu nome de usuário ou e-mail." },
      { property: "og:title", content: "Entrar — Pontual+" },
      { property: "og:description", content: "Acesse o Pontual+ com seu nome de usuário ou e-mail." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "esqueci">("entrar");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: "/inicio", replace: true }); });
    const { data } = supabase.auth.onAuthStateChange((e, s) => { if (e === "SIGNED_IN" && s) navigate({ to: "/inicio", replace: true }); });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const resolverEmail = async (v: string) => {
    const t = v.trim();
    if (t.includes("@")) return t;
    const { data } = await supabase.rpc("buscar_email_por_usuario", { _usuario: t });
    return (data as string | null) ?? null;
  };

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setEnviando(true);
    try {
      const email = await resolverEmail(login);
      if (modo === "entrar") {
        const { error } = email ? await supabase.auth.signInWithPassword({ email, password: senha }) : { error: true };
        if (error) throw new Error("Usuário ou senha incorretos, ou acesso ainda não autorizado. Se acabou de criar a conta, confirme pelo link enviado ao seu e-mail.");
      } else {
        if (email) await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
        toast.success("Se a conta existir, você receberá um link no e-mail para criar nova senha.");
        setModo("entrar");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const input = "w-full rounded-xl border bg-card px-4 py-4 text-lg";
  return (
    <div className="flex min-h-screen flex-col bg-hero">
      <div className="px-6 pb-10 pt-12 text-center text-navy-foreground">
        <img src={logo} alt="Logo do Pontual+" className="mx-auto mb-3 size-20 rounded-3xl bg-card p-2" />
        <div className="text-4xl font-extrabold">Pontual<span className="text-justified">+</span></div>
        <p className="mt-2 opacity-80">Registro de atrasos escolares</p>
      </div>
      <div className="flex-1 rounded-t-3xl bg-background px-6 py-8">
        <form onSubmit={enviar} className="mx-auto max-w-sm space-y-4">
          <h1 className="text-2xl font-extrabold">{modo === "entrar" ? "Entrar" : "Recuperar senha"}</h1>
          <input required aria-label="Usuário ou e-mail" placeholder="Usuário ou e-mail" autoComplete="username" autoCapitalize="none" value={login} onChange={(e) => setLogin(e.target.value)} className={input} />
          {modo === "entrar" && <input required aria-label="Senha" type="password" placeholder="Senha" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} className={input} />}
          <button disabled={enviando} className="w-full rounded-xl bg-primary py-4 text-lg font-extrabold text-primary-foreground disabled:opacity-50">
            {modo === "entrar" ? "Entrar" : "Enviar link"}
          </button>
          <div className="flex flex-col gap-3 pt-2 text-center font-semibold text-primary">
            {modo === "entrar"
              ? <button type="button" onClick={() => setModo("esqueci")}>Esqueci minha senha</button>
              : <button type="button" onClick={() => setModo("entrar")}>Voltar para entrar</button>}
            <Link to="/convite">Recebi um convite</Link>
            <Link to="/cadastrar-escola">Cadastrar minha escola</Link>
          </div>
          <p className="pt-4 text-center text-xs text-muted-foreground">Acesso somente para pessoas autorizadas pela escola.</p>
        </form>
      </div>
    </div>
  );
}
