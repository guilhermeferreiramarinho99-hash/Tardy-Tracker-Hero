import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { changeSchoolPassword } from "@/lib/gate.functions";

export function SenhaEscolaAdmin() {
  const change = useServerFn(changeSchoolPassword);
  const [busy, setBusy] = useState(false);
  return <form className="space-y-4 border-t pt-5" onSubmit={async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const password = String(values.get("new-password") ?? "");
    if (password !== values.get("confirm-password")) { toast.error("As novas senhas não coincidem."); return; }
    setBusy(true);
    try {
      await change({ data: { currentPassword: String(values.get("current-password") ?? ""), password } });
      form.reset();
      toast.success("Senha da escola alterada. Nos outros aparelhos, use a nova senha ao abrir novamente.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível alterar a senha."); }
    finally { setBusy(false); }
  }}>
    <h2 className="text-lg font-bold">Senha de entrada da escola</h2>
    {[
      ["current-password", "Senha atual da escola"],
      ["new-password", "Nova senha da escola"],
      ["confirm-password", "Confirmar nova senha"],
    ].map(([name, label]) => <label key={name} className="block font-semibold">{label}
      <input name={name} aria-label={label} required type="password" minLength={name === "current-password" ? 1 : 12} maxLength={128} autoComplete={name === "current-password" ? "current-password" : "new-password"} className="mt-2 w-full rounded-lg border bg-background px-4 py-3" />
    </label>)}
    <Button type="submit" disabled={busy}>{busy ? "Salvando…" : "Alterar senha da escola"}</Button>
  </form>;
}