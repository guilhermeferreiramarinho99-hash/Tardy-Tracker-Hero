import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), admin: true }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock("@/lib/api", () => ({ useMe: () => ({ data: { isAdmin: mocks.admin } }), erroAmigavel: (e: { message: string }) => e.message }));
import { ExcluirAluno } from "@/components/ExcluirAluno";

const aluno = { id: "aluno-ficticio", nome: "Aluno Fictício", codigo: "002" };
function montar() {
  const qc = new QueryClient();
  const invalidar = vi.spyOn(qc, "invalidateQueries");
  render(<QueryClientProvider client={qc}><ExcluirAluno aluno={aluno} /></QueryClientProvider>);
  return invalidar;
}

describe("Exclusão de alunos", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.admin = true; });
  afterEach(cleanup);
  it("só envia a exclusão após confirmação e atualiza a lista", async () => {
    mocks.rpc.mockResolvedValue({ error: null });
    const invalidar = montar();
    fireEvent.click(screen.getByRole("button", { name: "Excluir aluno Aluno Fictício" }));
    expect(mocks.rpc).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Excluir definitivamente" }));
    await waitFor(() => expect(invalidar).toHaveBeenCalledWith({ queryKey: ["alunos"] }));
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("excluir_aluno", { _id: "aluno-ficticio" });
  });
  it("cancelar não altera o cadastro", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Excluir aluno Aluno Fictício" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("mantém a lista quando o banco bloqueia a exclusão de aluno com histórico", async () => {
    mocks.rpc.mockResolvedValue({ error: { message: "Aluno possui histórico. Marque como Inativo." } });
    const invalidar = montar();
    fireEvent.click(screen.getByRole("button", { name: "Excluir aluno Aluno Fictício" }));
    fireEvent.click(screen.getByRole("button", { name: "Excluir definitivamente" }));
    await screen.findByRole("alert");
    expect(invalidar).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeEnabled();
  });
  it("não oferece exclusão para contas sem administração", () => {
    mocks.admin = false;
    montar();
    expect(screen.queryByRole("button")).toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});