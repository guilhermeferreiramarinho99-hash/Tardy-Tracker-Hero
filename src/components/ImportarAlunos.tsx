import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, FileUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { erroAmigavel, useTurmas } from "@/lib/api";
import { lerListaAlunos, type AlunoLido } from "@/lib/importar.functions";

const input = "rounded-xl border bg-card px-3 py-3";

function lerDataUrl(f: File) {
  return new Promise<string>((ok, erro) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = erro; r.readAsDataURL(f); });
}

// Shrinks phone photos so they upload quickly.
async function reduzirFoto(f: File): Promise<string> {
  const url = await lerDataUrl(f);
  const img = new Image();
  await new Promise((ok, erro) => { img.onload = ok; img.onerror = erro; img.src = url; }).catch(() => null);
  if (!img.width) return url;
  const escala = Math.min(1, 2000 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
  c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

async function lerPlanilha(f: File): Promise<AlunoLido[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await f.arrayBuffer(), { type: "array", raw: false });
  const linhas = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: "" });
  const out: AlunoLido[] = [];
  for (const l of linhas) {
    const cel = l.map((x) => String(x ?? "").trim()).filter(Boolean);
    const codigo = cel.find((x) => /^\d[\d.\-/]*$/.test(x)) ?? "";
    const nome = cel.find((x) => /[a-zA-ZÀ-ú]{2,}\s+[a-zA-ZÀ-ú]/.test(x)) ?? "";
    if (nome && codigo) out.push({ codigo, nome });
  }
  return out;
}

export function ImportarAlunos() {
  const qc = useQueryClient();
  const { data: turmas } = useTurmas();
  const [turma, setTurma] = useState("");
  const [lidos, setLidos] = useState<(AlunoLido & { marcado: boolean })[]>([]);
  const [lendo, setLendo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const receber = async (f: File | undefined) => {
    if (!f) return;
    setLendo(true);
    try {
      let lista: AlunoLido[];
      if (/\.(xlsx|xls|csv|ods)$/i.test(f.name)) lista = await lerPlanilha(f);
      else if (f.type === "application/pdf") lista = await lerListaAlunos({ data: { dataUrl: await lerDataUrl(f), nomeArquivo: f.name } });
      else if (f.type.startsWith("image/")) lista = await lerListaAlunos({ data: { dataUrl: await reduzirFoto(f), nomeArquivo: f.name } });
      else throw new Error("Envie uma foto, um PDF ou uma planilha.");
      if (lista.length === 0) toast.error("Nenhum aluno encontrado no arquivo.");
      setLidos(lista.map((a) => ({ ...a, marcado: true })));
    } catch (e) { toast.error(erroAmigavel(e)); }
    setLendo(false);
  };

  const confirmar = async () => {
    const lista = lidos.filter((a) => a.marcado).map(({ codigo, nome }) => ({ codigo: codigo.trim(), nome: nome.trim() }));
    if (!turma) { toast.error("Escolha a turma."); return; }
    if (lista.some((a) => !a.codigo)) { toast.error("Preencha o código de todos os alunos marcados."); return; }
    setSalvando(true);
    const { data, error } = await supabase.rpc("importar_alunos", { _turma: turma, _lista: lista });
    setSalvando(false);
    if (error) { toast.error(erroAmigavel(error)); return; }
    const r = data as { cadastrados: number; pulados: { codigo: string; nome: string; motivo: string }[] };
    toast.success(`${r.cadastrados} aluno(s) cadastrado(s).`);
    if (r.pulados.length) toast.info(`Não cadastrados: ${r.pulados.map((p) => `${p.codigo} ${p.nome} (${p.motivo})`).join("; ")}`, { duration: 12000 });
    setLidos([]);
    qc.invalidateQueries({ queryKey: ["alunos"] });
  };

  const editar = (i: number, campo: Partial<AlunoLido & { marcado: boolean }>) => setLidos((l) => l.map((a, j) => (j === i ? { ...a, ...campo } : a)));

  return (
    <div className="space-y-3 rounded-2xl border-2 border-dashed p-4">
      <h2 className="font-bold">Importar alunos de uma vez</h2>
      <p className="text-sm text-muted-foreground">Tire uma foto da lista da sala, ou envie um PDF ou planilha com <b>código</b> e <b>nome</b>. O código da escola é mantido (ex.: 002).</p>
      <select aria-label="Turma da importação" value={turma} onChange={(e) => setTurma(e.target.value)} className={`${input} w-full`}>
        <option value="">Para qual turma?</option>
        {turmas?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
      </select>
      <div className="flex flex-wrap gap-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground">
          <Camera className="size-5" /> Tirar foto
          <input type="file" accept="image/*" capture="environment" className="hidden" disabled={lendo} onChange={(e) => { receber(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 font-bold">
          <FileUp className="size-5" /> Enviar foto, PDF ou planilha
          <input type="file" accept="image/*,application/pdf,.xlsx,.xls,.csv,.ods" className="hidden" disabled={lendo} onChange={(e) => { receber(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>
      {lendo && <p className="flex items-center gap-2 font-semibold"><Loader2 className="size-5 animate-spin" /> Lendo a lista… pode levar alguns segundos.</p>}
      {lidos.length > 0 && (
        <div className="space-y-2">
          <p className="font-bold">Confira antes de cadastrar ({lidos.filter((a) => a.marcado).length} marcados):</p>
          <ul className="max-h-96 divide-y overflow-auto rounded-xl border">
            {lidos.map((a, i) => (
              <li key={i} className="flex items-center gap-2 p-2">
                <input type="checkbox" aria-label={`Incluir ${a.nome}`} className="size-5" checked={a.marcado} onChange={(e) => editar(i, { marcado: e.target.checked })} />
                <input aria-label="Código" value={a.codigo} onChange={(e) => editar(i, { codigo: e.target.value })} className={`${input} w-24 py-2 font-mono`} placeholder="Código" />
                <input aria-label="Nome" value={a.nome} onChange={(e) => editar(i, { nome: e.target.value })} className={`${input} flex-1 py-2`} />
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button disabled={salvando} onClick={confirmar} className="rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-50">{salvando ? "Cadastrando…" : "Confirmar e cadastrar todos"}</button>
            <button onClick={() => setLidos([])} className="rounded-xl border px-4 py-3 font-bold">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
