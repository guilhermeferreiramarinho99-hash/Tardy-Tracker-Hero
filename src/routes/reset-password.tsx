import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — Pontual+" },
      { name: "description", content: "Crie uma nova senha para sua conta Pontual+." },
      { property: "og:title", content: "Nova senha — Pontual+" },
      { property: "og:description", content: "Crie uma nova senha para sua conta Pontual+." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) { toast.error("Link inválido ou expirado. Peça um novo."); return; }
    toast.success("Senha alterada!");
    navigate({ to: "/inicio" });
  };
  return (
    <form onSubmit={salvar} className="mx-auto mt-20 max-w-sm space-y-4 px-6">
      <h1 className="text-2xl font-extrabold">Criar nova senha</h1>
      <input required type="password" minLength={8} placeholder="Nova senha (mínimo 8 caracteres)" value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full rounded-xl border bg-card px-4 py-4 text-lg" />
      <button className="w-full rounded-xl bg-primary py-4 text-lg font-extrabold text-primary-foreground">Salvar senha</button>
    </form>
  );
}
