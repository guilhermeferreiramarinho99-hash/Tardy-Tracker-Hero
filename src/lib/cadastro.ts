import { supabase } from "@/integrations/supabase/client";
import type { Rascunho } from "@/lib/api";

/** Cria a conta e guarda o próximo passo (convite ou escola) na própria conta, aplicado após o primeiro login. */
export async function criarConta(nome: string, email: string, senha: string, rascunho: Rascunho) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password: senha,
    options: { emailRedirectTo: window.location.origin + "/auth", data: { nome: nome.trim(), pontual_rascunho: rascunho } },
  });
  if (error) {
    if (/weak|pwned/i.test(error.message)) throw new Error("Senha fraca ou já vazada na internet. Escolha uma senha mais forte.");
    if (/registered|exists/i.test(error.message)) throw new Error("Este e-mail já tem conta. Entre com ele e use o convite pela tela da escola.");
    throw error;
  }
  return { logado: !!data.session };
}

export async function aplicarRascunho(r: Rascunho) {
  const { error } = r.tipo === "convite"
    ? await supabase.rpc("resgatar_convite", { _codigo: r.codigo.trim() })
    : await supabase.rpc("cadastrar_escola_completa", {
        _nome: r.nome, _email_institucional: r.email_institucional, _endereco: r.endereco,
        _cidade: r.cidade, _estado: r.estado, _cep: r.cep, _telefone: r.telefone,
      });
  await supabase.auth.updateUser({ data: { pontual_rascunho: null } });
  if (error) throw error;
}
