import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  alunosSeed, atrasosSeed, periodosSeed, turmasSeed,
  type Alerta, type Aluno, type Atraso, type Auditoria, type Config, type Periodo, type Turma,
} from "./data";

// ETAPA 1: os dados ficam salvos neste navegador (provisório).
// Na etapa 2 serão migrados para o banco de dados seguro com login.
type State = {
  turmas: Turma[]; alunos: Aluno[]; atrasos: Atraso[]; periodos: Periodo[];
  alertas: Alerta[]; auditoria: Auditoria[]; config: Config;
};
const KEY = "pontualmais-demo-v1";
const initial: State = {
  turmas: turmasSeed, alunos: alunosSeed, atrasos: atrasosSeed, periodos: periodosSeed,
  alertas: [], auditoria: [], config: { limite: 3, contarJustificados: true },
};

export const USUARIO_DEMO = "Equipe escolar (demonstração)";
export const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const agoraHora = () => new Date().toTimeString().slice(0, 5);
export const fmtData = (iso: string) => iso.split("-").reverse().join("/");

export function periodoDe(periodos: Periodo[], data: string) {
  return periodos.find((p) => data >= p.inicio && data <= p.fim);
}

type Result = { ok: true; alerta?: Alerta } | { ok: false; erro: string };

type Ctx = State & {
  registrar: (a: Omit<Atraso, "id" | "registradoPor">) => Result;
  corrigir: (id: string, justificado: boolean, motivo: string) => void;
  cancelar: (id: string, motivo: string) => void;
  analisarAlerta: (id: string, encaminhamento: string) => void;
  atrasosNoPeriodo: (alunoId: string, periodoId?: string) => Atraso[];
  resetar: () => void;
};
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(initial);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setS({ ...initial, ...JSON.parse(raw) });
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(s));
  }, [s, loaded]);

  const log = (operacao: string): Auditoria => ({
    id: crypto.randomUUID(), quando: new Date().toISOString(), usuario: USUARIO_DEMO, operacao,
  });

  const contar = (st: State, alunoId: string, p?: Periodo) =>
    st.atrasos.filter(
      (a) => a.alunoId === alunoId && !a.cancelado && (!p || (a.data >= p.inicio && a.data <= p.fim)) &&
        (st.config.contarJustificados || !a.justificado),
    );

  const registrar: Ctx["registrar"] = (novo) => {
    const dup = s.atrasos.find((a) => a.alunoId === novo.alunoId && a.data === novo.data && !a.cancelado);
    if (dup) return { ok: false, erro: `Já existe um atraso registrado para este aluno hoje (às ${dup.hora}).` };
    const aluno = s.alunos.find((a) => a.id === novo.alunoId)!;
    const atraso: Atraso = { ...novo, id: crypto.randomUUID(), registradoPor: USUARIO_DEMO };
    const next: State = { ...s, atrasos: [...s.atrasos, atraso] };
    const p = periodoDe(s.periodos, novo.data);
    let alerta: Alerta | undefined;
    if (p) {
      const qtd = contar(next, novo.alunoId, p).length;
      const existe = s.alertas.find((al) => al.alunoId === novo.alunoId && al.periodoId === p.id);
      if (qtd >= s.config.limite && !existe) {
        alerta = { id: crypto.randomUUID(), alunoId: novo.alunoId, periodoId: p.id, quantidade: qtd, geradoEm: new Date().toISOString(), status: "pendente" };
        next.alertas = [...s.alertas, alerta];
      } else if (existe) {
        next.alertas = s.alertas.map((al) => (al.id === existe.id ? { ...al, quantidade: qtd } : al));
      }
    }
    next.auditoria = [log(`Registrou atraso de ${aluno.nome} (${novo.justificado ? "justificado" : "sem justificativa"})`), ...s.auditoria];
    setS(next);
    return { ok: true, alerta };
  };

  const corrigir: Ctx["corrigir"] = (id, justificado, motivo) =>
    setS((st) => {
      const a = st.atrasos.find((x) => x.id === id)!;
      const aluno = st.alunos.find((x) => x.id === a.alunoId)!;
      return {
        ...st,
        atrasos: st.atrasos.map((x) => (x.id === id ? { ...x, justificado } : x)),
        auditoria: [log(`Corrigiu atraso de ${aluno.nome} em ${fmtData(a.data)} para "${justificado ? "justificado" : "sem justificativa"}". Motivo: ${motivo}`), ...st.auditoria],
      };
    });

  const cancelar: Ctx["cancelar"] = (id, motivo) =>
    setS((st) => {
      const a = st.atrasos.find((x) => x.id === id)!;
      const aluno = st.alunos.find((x) => x.id === a.alunoId)!;
      return {
        ...st,
        atrasos: st.atrasos.map((x) => (x.id === id ? { ...x, cancelado: true } : x)),
        auditoria: [log(`Cancelou atraso de ${aluno.nome} em ${fmtData(a.data)}. Motivo: ${motivo}`), ...st.auditoria],
      };
    });

  const analisarAlerta: Ctx["analisarAlerta"] = (id, encaminhamento) =>
    setS((st) => ({
      ...st,
      alertas: st.alertas.map((a) => (a.id === id ? { ...a, status: "analisado", encaminhamento } : a)),
      auditoria: [log(`Marcou alerta como analisado: ${encaminhamento}`), ...st.auditoria],
    }));

  const atrasosNoPeriodo: Ctx["atrasosNoPeriodo"] = (alunoId, periodoId) => {
    const p = s.periodos.find((x) => x.id === periodoId);
    return s.atrasos
      .filter((a) => a.alunoId === alunoId && !a.cancelado && (!p || (a.data >= p.inicio && a.data <= p.fim)))
      .sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));
  };

  return (
    <StoreCtx.Provider value={{ ...s, registrar, corrigir, cancelar, analisarAlerta, atrasosNoPeriodo, resetar: () => setS(initial) }}>
      {children}
    </StoreCtx.Provider>
  );
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("StoreProvider ausente");
  return c;
}
