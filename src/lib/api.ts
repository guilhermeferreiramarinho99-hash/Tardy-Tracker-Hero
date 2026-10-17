import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Papel = "admin" | "equipe" | "coordenacao" | "aluno";
export const papelNome: Record<Papel, string> = {
  admin: "Administrador",
  equipe: "Equipe escolar",
  coordenacao: "Coordenação",
  aluno: "Aluno",
};

export function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function horaAtual() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
export const fmtData = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
export const fmtHora = (h: string) => h.slice(0, 5);

export function erroAmigavel(e: unknown): string {
  const m = (e as { message?: string; code?: string })?.message ?? "Erro inesperado";
  if ((e as { code?: string })?.code === "23505") return "Já existe um cadastro com esses dados (nome ou código repetido).";
  if (m.includes("row-level security") || m.includes("permission denied")) return "Você não tem permissão para esta ação.";
  return m;
}

function unwrap<T>(r: { data: T | null; error: unknown }): T {
  if (r.error) throw r.error;
  return r.data as T;
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return null;
      const [prof, roles, escola, sa] = await Promise.all([
        supabase.from("profiles").select("nome,email,usuario").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("escolas").select("id,nome,status,email_institucional,endereco,cidade,estado,cep,telefone").maybeSingle(),
        supabase.rpc("eh_superadmin", {}),
      ]);
      if (prof.error) throw prof.error;
      if (roles.error) throw roles.error;
      if (escola.error) throw escola.error;
      const r = (roles.data ?? []).map((x) => x.role as Papel).filter((x) => x in papelNome);
      return {
        id: user.id,
        escola: escola.data,
        rascunho: (user.user_metadata?.pontual_rascunho ?? null) as Rascunho | null,
        nome: prof.data?.nome || user.email || "Usuário",
        roles: r,
        ehSuperadmin: !!sa.data,
        isAdmin: r.includes("admin"),
        isGestor: r.includes("admin") || r.includes("coordenacao"),
        isStaff: r.some((x) => x !== "aluno"),
        isAluno: r.includes("aluno"),
      };
    },
  });
}

export type Rascunho =
  | { tipo: "convite"; codigo: string }
  | { tipo: "escola"; nome: string; email_institucional: string; endereco: string; cidade: string; estado: string; cep: string; telefone: string };

export const ANOS = ["6º ano", "7º ano", "8º ano", "9º ano", "1ª série", "2ª série", "3ª série"];

export const useTurmas = () =>
  useQuery({ queryKey: ["turmas"], queryFn: async () => unwrap(await supabase.from("turmas").select("*").order("ordem")) });

export const useAlunos = () =>
  useQuery({ queryKey: ["alunos"], queryFn: async () => unwrap(await supabase.from("alunos").select("*").order("nome")) });

export const usePeriodos = () =>
  useQuery({ queryKey: ["periodos"], queryFn: async () => unwrap(await supabase.from("periodos").select("*").order("inicio")) });

export const useConfig = () =>
  useQuery({
    queryKey: ["config"],
    queryFn: async () => {
      const r = await supabase.from("escola_config").select("*").single();
      if (r.error) throw r.error;
      return r.data;
    },
  });

export const useAtrasos = () =>
  useQuery({
    queryKey: ["atrasos"],
    queryFn: async () => unwrap(await supabase.from("atrasos").select("*").eq("cancelado", false).order("data", { ascending: false }).order("hora", { ascending: false })),
  });

export const useAlertas = (enabled = true) =>
  useQuery({ queryKey: ["alertas"], enabled, queryFn: async () => unwrap(await supabase.from("alertas").select("*").order("gerado_em", { ascending: false })) });

export const useEncaminhamentos = (enabled = true) =>
  useQuery({ queryKey: ["encaminhamentos"], enabled, queryFn: async () => unwrap(await supabase.from("encaminhamentos").select("*").order("created_at", { ascending: false })) });

export type Periodo = { id: string; nome: string; inicio: string; fim: string };
export function periodoDe(periodos: Periodo[] | undefined, data: string) {
  return periodos?.find((p) => data >= p.inicio && data <= p.fim);
}
export function periodoAtualOuUltimo(periodos: Periodo[] | undefined) {
  const h = hojeISO();
  return periodoDe(periodos, h) ?? [...(periodos ?? [])].reverse().find((p) => p.inicio <= h) ?? periodos?.[0];
}
