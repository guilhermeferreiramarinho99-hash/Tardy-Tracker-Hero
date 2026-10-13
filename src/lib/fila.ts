// Fila de atrasos registrados sem internet.
//
// Quando o aparelho está sem sinal, o atraso é guardado no próprio aparelho e
// enviado ao banco de dados oficial assim que a conexão volta. Enquanto não é
// enviado, o registro NÃO faz parte do histórico oficial da escola.
import { del, get, keys, set } from "idb-keyval";
import { supabase } from "@/integrations/supabase/client";
import { erroAmigavel } from "@/lib/api";

export type ItemFila = {
  id: string;
  userId: string;
  alunoId: string;
  alunoNome: string;
  turmaNome: string;
  justificado: boolean;
  observacao: string;
  data: string; // YYYY-MM-DD (dia em que o atraso aconteceu)
  hora: string; // HH:MM (horário em que foi confirmado no aparelho)
  criadoEm: string;
  erro?: string; // motivo de um envio que não vai dar certo
};

const PREFIXO = "pontual+fila:";
const chave = (id: string) => PREFIXO + id;

export async function enfileirar(item: ItemFila) {
  await set(chave(item.id), item);
  avisarMudancaNaFila();
}

export async function descartar(id: string) {
  await del(chave(id));
  avisarMudancaNaFila();
}

const EVENTO = "pontual:fila";
export function avisarMudancaNaFila() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO));
}
export function ouvirMudancaNaFila(fn: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENTO, fn);
  return () => window.removeEventListener(EVENTO, fn);
}

export async function listarFila(userId?: string): Promise<ItemFila[]> {
  try {
    const todas = await keys();
    const nomes = todas.filter((k): k is string => typeof k === "string" && k.startsWith(PREFIXO));
    const itens = (await Promise.all(nomes.map((k) => get<ItemFila>(k)))).filter(
      (i): i is ItemFila => Boolean(i),
    );
    const meus = userId ? itens.filter((i) => i.userId === userId) : itens;
    return meus.sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  } catch {
    return [];
  }
}

export function estaSemInternet() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function ehErroDeRede(e: unknown): boolean {
  if (e instanceof TypeError) return true;
  const m = String((e as { message?: string })?.message ?? e ?? "");
  return /failed to fetch|networkerror|network request failed|load failed|err_internet|err_name_not_resolved|timed? ?out/i.test(
    m,
  );
}

export type ResultadoEnvio = { enviados: number; problemas: number; semInternet: boolean };

// Envia, um a um, os atrasos que estão aguardando no aparelho.
export async function enviarFila(userId: string): Promise<ResultadoEnvio> {
  const itens = await listarFila(userId);
  if (itens.length === 0) return { enviados: 0, problemas: 0, semInternet: false };
  if (estaSemInternet()) return { enviados: 0, problemas: 0, semInternet: true };

  const { data: sessao } = await supabase.auth.getSession();
  if (!sessao.session || sessao.session.user.id !== userId) return { enviados: 0, problemas: 0, semInternet: false };

  let enviados = 0;
  let problemas = 0;

  for (const it of itens) {
    const { error } = await supabase.rpc("registrar_atraso_offline", {
      _aluno: it.alunoId,
      _justificado: it.justificado,
      _observacao: it.observacao,
      _data: it.data,
      _hora: `${it.hora}:00`,
    });

    if (!error) {
      await del(chave(it.id));
      enviados += 1;
      continue;
    }

    // Já existe registro oficial nesse dia: não precisa mandar de novo.
    if (error.code === "23505" || /j[áa] existe/i.test(error.message)) {
      await del(chave(it.id));
      continue;
    }

    // Problema que não se resolve sozinho: o item fica guardado com o motivo.
    if (/permiss[ãa]o|permission denied|row-level security|n[ãa]o encontrado|inativo|futuro|antiga demais/i.test(error.message)) {
      await set(chave(it.id), { ...it, erro: erroAmigavel(error) });
      problemas += 1;
      continue;
    }

    // Sem conexão no meio do envio: tenta de novo mais tarde.
    if (ehErroDeRede(error)) {
      problemas += 1;
      continue;
    }

    await set(chave(it.id), { ...it, erro: erroAmigavel(error) });
    problemas += 1;
  }

  return { enviados, problemas, semInternet: estaSemInternet() };
}
