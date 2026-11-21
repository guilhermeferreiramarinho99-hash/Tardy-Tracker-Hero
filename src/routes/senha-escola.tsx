import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { unlockSchool } from "@/lib/gate.functions";
import { nomeEscola } from "@/lib/escola";
import { pageHead } from "@/lib/page-head";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/senha-escola")({
  head: () => pageHead("Senha da escola", "Entrada da Escola Estadual Menodora Fialho de Figueiredo no Pontual+."),
  component: SchoolPassword,
});

function SchoolPassword() {
  const router = useRouter();
  const unlock = useServerFn(unlockSchool);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <main className="flex min-h-screen flex-col bg-hero">
    <header className="px-6 pb-8 pt-10 text-center text-navy-foreground">
      <img src={logo} alt="Pontual+" className="mx-auto mb-3 size-20 rounded-2xl bg-card p-2" />
      <h1 className="text-4xl font-extrabold">Pontual<span className="text-justified">+</span></h1>
      <p className="mx-auto mt-3 max-w-sm font-semibold">{nomeEscola}</p>
    </header>
    <section className="flex-1 rounded-t-3xl bg-background px-6 py-8">
      <form className="mx-auto max-w-sm space-y-5" onSubmit={async (event) => {
        event.preventDefault(); setBusy(true); setError("");
        try {
          const result = await unlock({ data: { password } });
          if (!result.ok) { setError("Senha da escola incorreta."); return; }
          setPassword("");
          await router.invalidate();
          await router.navigate({ to: "/auth", replace: true });
        } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível entrar. Confira sua conexão."); }
        finally { setBusy(false); }
      }}>
        <h2 className="flex items-center gap-2 text-xl font-bold"><LockKeyhole className="size-5" /> Senha da escola</h2>
        <label className="block font-semibold">Senha da escola
          <input required aria-label="Senha da escola" type="password" maxLength={128} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border bg-card px-4 py-4 text-lg" />
        </label>
        {error && <p role="alert" className="text-sm text-late">{error}</p>}
        <Button disabled={busy} type="submit" className="h-14 w-full text-lg font-bold">{busy ? "Aguarde…" : "Continuar"}</Button>
      </form>
    </section>
  </main>;
}