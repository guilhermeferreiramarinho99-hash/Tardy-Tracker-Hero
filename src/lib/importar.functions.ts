import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AlunoLido = { codigo: string; nome: string };

const MAX_BYTES = 8 * 1024 * 1024;

// Reads a photo or PDF of a class list and returns code + name pairs, keeping the school's own codes.
export const lerListaAlunos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { dataUrl: string; nomeArquivo: string }) => {
    if (typeof d?.dataUrl !== "string" || !/^data:(image\/(png|jpe?g|webp|heic|heif)|application\/pdf);base64,/.test(d.dataUrl)) throw new Error("Envie uma foto (JPG/PNG) ou um PDF.");
    if (d.dataUrl.length > MAX_BYTES * 1.4) throw new Error("Arquivo muito grande (máximo 8 MB).");
    return { dataUrl: d.dataUrl, nomeArquivo: String(d.nomeArquivo || "lista").slice(0, 100) };
  })
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("Apenas a administração pode importar alunos.");
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Leitura de arquivos não configurada.");

    const ehPdf = data.dataUrl.startsWith("data:application/pdf");
    const arquivo = ehPdf
      ? { type: "input_file", filename: data.nomeArquivo.endsWith(".pdf") ? data.nomeArquivo : "lista.pdf", file_data: data.dataUrl }
      : { type: "input_image", image_url: data.dataUrl };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: "Esta é uma lista de alunos de uma escola brasileira. Extraia cada aluno com o CÓDIGO exatamente como aparece (mantenha zeros à esquerda, ex.: 002) e o NOME COMPLETO. Ignore cabeçalhos, assinaturas e linhas vazias. Não invente alunos. Se não houver código visível para um aluno, use string vazia." },
            arquivo,
          ],
        }],
        text: { format: { type: "json_schema", name: "lista_alunos", strict: true, schema: {
          type: "object", additionalProperties: false, required: ["alunos"],
          properties: { alunos: { type: "array", items: { type: "object", additionalProperties: false, required: ["codigo", "nome"], properties: { codigo: { type: "string" }, nome: { type: "string" } } } } },
        } } },
      }),
    });
    if (res.status === 402 || res.status === 403) throw new Error("A leitura automática está indisponível no momento (limite de uso). Tente pela planilha.");
    if (res.status === 429) throw new Error("Muitas leituras seguidas. Aguarde um minuto e tente de novo.");
    if (!res.ok || !res.body) throw new Error("Não foi possível ler o arquivo. Tente uma foto mais nítida.");

    let texto = "";
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const linhas = buf.split("\n");
      buf = linhas.pop() ?? "";
      for (const l of linhas) {
        if (!l.startsWith("data:")) continue;
        const p = l.slice(5).trim();
        if (!p || p === "[DONE]") continue;
        try {
          const ev = JSON.parse(p) as { type?: string; delta?: string };
          if (ev.type === "response.output_text.delta" && ev.delta) texto += ev.delta;
        } catch { /* ignore partial */ }
      }
    }
    try {
      const out = JSON.parse(texto) as { alunos: AlunoLido[] };
      return out.alunos
        .map((a) => ({ codigo: String(a.codigo ?? "").trim(), nome: String(a.nome ?? "").replace(/\s+/g, " ").trim() }))
        .filter((a) => a.nome.length >= 3)
        .slice(0, 300);
    } catch {
      throw new Error("Não foi possível entender a lista. Tente uma foto mais nítida.");
    }
  });
