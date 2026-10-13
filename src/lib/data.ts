// Dados FICTÍCIOS de demonstração — nenhum dado real de estudantes.
export type Turma = { id: string; ano: string; nome: string };
export type Aluno = { id: string; codigo: string; nome: string; turmaId: string; ativo: boolean };
export type Atraso = {
  id: string;
  alunoId: string;
  data: string; // yyyy-mm-dd
  hora: string; // HH:mm
  justificado: boolean;
  observacao?: string;
  registradoPor: string;
  cancelado?: boolean;
};
export type Periodo = { id: string; nome: string; inicio: string; fim: string };
export type Alerta = {
  id: string;
  alunoId: string;
  periodoId: string;
  quantidade: number;
  geradoEm: string;
  status: "pendente" | "analisado";
  encaminhamento?: string;
};
export type Auditoria = { id: string; quando: string; usuario: string; operacao: string };
export type Config = { limite: number; contarJustificados: boolean };

const anos = ["6º ano", "7º ano", "8º ano", "9º ano", "1ª série EM", "2ª série EM", "3ª série EM"];
export const turmasSeed: Turma[] = anos.flatMap((ano, i) =>
  ["A", "B"].map((l) => ({ id: `t${i}${l}`, ano, nome: `${ano} ${l}` })),
);

const nomes = [
  "Ana Beatriz Souza", "Bruno Henrique Lima", "Carla Mendes Rocha", "Diego Alves Pereira",
  "Eduarda Martins Costa", "Felipe Oliveira Santos", "Gabriela Ferreira Nunes", "Heitor Ribeiro Dias",
  "Isabela Carvalho Melo", "João Pedro Barbosa", "Larissa Gomes Teixeira", "Mateus Araújo Freitas",
  "Natália Cardoso Pires", "Otávio Monteiro Reis", "Paula Cristina Moura", "Rafael Duarte Campos",
  "Sofia Almeida Prado", "Thiago Nogueira Brito", "Valentina Castro Lopes", "Yuri Fernandes Vieira",
  "Alice Rezende Tavares", "Caio Batista Farias", "Helena Moreira Cunha", "Lucas Pinheiro Andrade",
  "Manuela Azevedo Ramos", "Pedro Lucas Sales", "Rebeca Siqueira Leal", "Samuel Correia Matos",
];
export const alunosSeed: Aluno[] = nomes.map((nome, i) => ({
  id: `a${i + 1}`,
  codigo: `P+${String(2027000 + i + 1)}`,
  nome,
  turmaId: turmasSeed[i % turmasSeed.length].id,
  ativo: true,
}));

// Bimestres de demonstração (configuráveis pela administração em etapa futura).
export const periodosSeed: Periodo[] = [
  { id: "b1", nome: "1º bimestre", inicio: "2026-02-02", fim: "2026-04-24" },
  { id: "b2", nome: "2º bimestre", inicio: "2026-04-27", fim: "2026-07-10" },
  { id: "b3", nome: "3º bimestre", inicio: "2026-07-27", fim: "2026-10-02" },
  { id: "b4", nome: "4º bimestre", inicio: "2026-10-05", fim: "2026-12-18" },
];

export const atrasosSeed: Atraso[] = [
  { id: "r1", alunoId: "a1", data: "2026-03-10", hora: "07:18", justificado: false, registradoPor: "Portaria (Maria)" },
  { id: "r2", alunoId: "a1", data: "2026-05-14", hora: "07:22", justificado: true, observacao: "Consulta médica", registradoPor: "Secretaria (José)" },
  { id: "r3", alunoId: "a2", data: "2026-08-20", hora: "07:15", justificado: false, registradoPor: "Portaria (Maria)" },
  { id: "r4", alunoId: "a3", data: "2026-10-06", hora: "07:25", justificado: false, registradoPor: "Portaria (Maria)" },
  { id: "r5", alunoId: "a3", data: "2026-10-08", hora: "07:12", justificado: true, observacao: "Ônibus atrasou", registradoPor: "Secretaria (José)" },
  { id: "r6", alunoId: "a5", data: "2026-10-07", hora: "07:30", justificado: false, registradoPor: "Portaria (Maria)" },
];
