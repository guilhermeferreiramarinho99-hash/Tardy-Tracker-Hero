import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { gateVersionMatches, validateGatePassword } from "./gate-policy";

export const schoolGateStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { currentGate, gateSession } = await import("./gate.server");
  const [config, session] = await Promise.all([currentGate(), gateSession()]);
  return { unlocked: gateVersionMatches(session.data.version, config.version) };
});

export const unlockSchool = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => {
    if (typeof data.password !== "string" || data.password.length > 128) throw new Error("Senha inválida.");
    return data;
  })
  .handler(async ({ data }) => {
    const { currentGate, gateSession, matchesPassword } = await import("./gate.server");
    const config = await currentGate();
    const session = await gateSession();
    if (!matchesPassword(data.password, config.digest)) return { ok: false };
    await session.update({ version: config.version });
    return { ok: true };
  });

export const changeSchoolPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { currentPassword: string; password: string }) => {
    validateGatePassword(data.password);
    if (typeof data.currentPassword !== "string" || data.currentPassword.length > 128) throw new Error("Senha inválida.");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { data: admin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || !admin) throw new Error("Somente a administração pode trocar a senha da escola.");
    const { currentGate, gateSession, matchesPassword, digestPassword } = await import("./gate.server");
    const config = await currentGate();
    if (!matchesPassword(data.currentPassword, config.digest)) throw new Error("Senha atual da escola incorreta.");
    const result = await context.supabase.rpc("trocar_senha_escola", { _digest: digestPassword(data.password) });
    if (result.error || !result.data) throw new Error("Não foi possível trocar a senha da escola.");
    const session = await gateSession();
    await session.update({ version: result.data });
    return { ok: true };
  });