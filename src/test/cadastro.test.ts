import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ signUp: vi.fn(), signInWithPassword: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
import { criarConta } from "@/lib/cadastro";

describe("Cadastro sem confirmação de e-mail", () => {
  beforeEach(() => vi.resetAllMocks());
  it("entra imediatamente quando o cadastro retorna uma sessão", async () => {
    auth.signUp.mockResolvedValue({ data: { session: { user: { id: "ficticio" } } }, error: null });
    expect(await criarConta("Pessoa fictícia", "teste@escolaficticia.com", "senha-ficticia", { tipo: "convite", codigo: "TESTE" })).toEqual({ logado: true });
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });
  it("tenta e-mail e senha sem exigir código se a sessão não vier", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    auth.signInWithPassword.mockResolvedValue({ data: { session: { user: { id: "ficticio" } } }, error: null });
    expect(await criarConta("Pessoa", " teste@escolaficticia.com ", "senha-ficticia", { tipo: "convite", codigo: "TESTE" })).toEqual({ logado: true });
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "teste@escolaficticia.com", password: "senha-ficticia" });
  });
  it("não considera o usuário conectado sem uma sessão válida", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    auth.signInWithPassword.mockResolvedValue({ data: { session: null }, error: { message: "Falhou" } });
    await expect(criarConta("Pessoa", "teste@escolaficticia.com", "senha-ficticia", { tipo: "convite", codigo: "TESTE" })).rejects.toThrow("Não foi possível entrar");
  });
});