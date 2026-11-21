import { createHmac, timingSafeEqual } from "node:crypto";
import { useSession, setResponseHeader } from "@tanstack/react-start/server";

export function digestPassword(password: string) {
  const secret = process.env['SESSION_SECRET'];
  if (!secret) throw new Error("A senha da escola ainda não foi configurada.");
  return createHmac("sha256", secret).update(password, "utf8").digest("hex");
}

export function matchesPassword(password: string, digest: string) {
  const actual = Buffer.from(digestPassword(password), "hex");
  const expected = Buffer.from(digest, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function gateSession() {
  const secret = process.env['SESSION_SECRET'];
  if (!secret) throw new Error("A senha da escola ainda não foi configurada.");
  setResponseHeader("cache-control", "no-store");
  return useSession<{ version?: string }>({
    name: "pontual-school-gate", password: secret, maxAge: 60 * 60 * 24 * 7,
    cookie: { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
  });
}

export async function currentGate() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("site_gate_config").select("password_digest,version").eq("id", 1).maybeSingle();
  if (error) throw new Error("Não foi possível verificar a senha da escola. Tente novamente.");
  if (data) return { digest: data.password_digest, version: data.version };
  const initial = process.env['SITE_PASSWORD'];
  if (!initial) throw new Error("A senha da escola ainda não foi configurada.");
  const digest = digestPassword(initial);
  return { digest, version: digest };
}