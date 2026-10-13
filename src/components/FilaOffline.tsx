// Aviso e envio dos atrasos que estão aguardando no aparelho por falta de internet.
import { useCallback, useEffect, useState } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CloudOff, RefreshCw, X } from "lucide-react";
import { descartar, enviarFila, listarFila, ouvirMudancaNaFila, type ItemFila } from "@/lib/fila";
import { fmtData, fmtHora, useMe } from "@/lib/api";

let enviandoAgora = false;

async function enviarAgora(userId: string, qc: QueryClient) {
  if (enviandoAgora) return;
  enviandoAgora = true;
  try {
    const r = await enviarFila(userId);
    if (r.enviados > 0) {
      toast.success(
        r.enviados === 1
          ? "Atraso registrado sem internet foi enviado e já aparece no sistema."
          : `${r.enviados} atrasos registrados sem internet foram enviados e já aparecem no sistema.`,
      );
      qc.invalidateQueries({ queryKey: ["atrasos"] });
      qc.invalidateQueries({ queryKey: ["alertas"] });
    }
    if (r.problemas > 0 && !r.semInternet) {
      toast.error("Alguns atrasos ainda não puderam ser enviados. Veja o aviso na parte de cima da tela.");
    }
  } finally {
    enviandoAgora = false;
  }
}

export function AvisoFilaOffline() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [itens, setItens] = useState<ItemFila[]>([]);

  const atualizar = useCallback(() => {
    if (me?.isStaff) void listarFila(me.id).then(setItens);
  }, [me?.id, me?.isStaff]);

  useEffect(() => {
    atualizar();
    return ouvirMudancaNaFila(atualizar);
  }, [atualizar]);

  // Ao voltar a conexão, tenta enviar na hora.
  useEffect(() => {
    const aoVoltar = () => {
      if (me?.isStaff) void enviarAgora(me.id, qc).finally(atualizar);
    };
    window.addEventListener("online", aoVoltar);
    return () => window.removeEventListener("online", aoVoltar);
  }, [me?.id, me?.isStaff, qc, atualizar]);

  // Enquanto houver algo guardado, tenta de tempos em tempos.
  useEffect(() => {
    if (!itens.length || !me?.isStaff) return;
    if (navigator.onLine) void enviarAgora(me.id, qc).finally(atualizar);
    const t = setInterval(() => void enviarAgora(me.id, qc).finally(atualizar), 25000);
    return () => clearInterval(t);
  }, [itens.length, me?.id, me?.isStaff, qc, atualizar]);

  if (!me?.isStaff || itens.length === 0) return null;

  return (
    <section
      role="status"
      aria-label="Atrasos aguardando envio"
      className="border-b border-justified/50 bg-justified-soft px-5 py-4"
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center gap-3">
          <CloudOff className="size-6 shrink-0 text-justified" />
          <p className="text-base font-extrabold text-justified">
            {itens.length === 1
              ? "1 atraso registrado sem internet aguarda envio"
              : `${itens.length} atrasos registrados sem internet aguardam envio`}
          </p>
          <button
            onClick={() => void enviarAgora(me.id, qc).finally(atualizar)}
            className="ml-auto flex items-center gap-2 rounded-xl border border-justified/50 bg-card px-4 py-2 font-bold text-justified"
          >
            <RefreshCw className="size-4" /> Enviar agora
          </button>
        </div>
        <ul className="mt-3 space-y-2">
          {itens.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-card px-4 py-2 text-sm">
              <span className="font-bold">{i.alunoNome}</span>
              <span className="text-muted-foreground">{i.turmaNome}</span>
              <span className="text-muted-foreground">
                {fmtData(i.data)} às {fmtHora(i.hora)}
              </span>
              <span className={i.justificado ? "font-semibold text-justified" : "font-semibold text-late"}>
                {i.justificado ? "Justificado" : "Sem justificativa"}
              </span>
              {i.erro && (
                <>
                  <span className="font-semibold text-late">Não foi possível enviar: {i.erro}</span>
                  <button
                    onClick={() => void descartar(i.id)}
                    className="ml-auto flex items-center gap-1 rounded-lg border px-3 py-1 font-bold"
                  >
                    <X className="size-4" /> Dispensar
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          Estes registros estão guardados apenas neste aparelho. Eles entram no histórico oficial da escola
          quando o envio for concluído.
        </p>
      </div>
    </section>
  );
}
