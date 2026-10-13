import type { Periodo } from "@/lib/api";

const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function PeriodCalendar({ periodo, atrasos }: { periodo: Periodo; atrasos: { data: string; justificado: boolean }[] }) {
  const mapa = new Map(atrasos.map((a) => [a.data, a.justificado]));
  const [y1 = 0, m1 = 1] = periodo.inicio.split("-").map(Number);
  const [y2 = 0, m2 = 1] = periodo.fim.split("-").map(Number);
  const months: [number, number][] = [];
  for (let y = y1, m = m1; y < y2 || (y === y2 && m <= m2); m === 12 ? (y++, (m = 1)) : m++) months.push([y, m]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {months.map(([y, m]) => {
        const first = new Date(y, m - 1, 1).getDay();
        const dias = new Date(y, m, 0).getDate();
        return (
          <div key={`${y}-${m}`} className="rounded-xl border bg-card p-3">
            <div className="mb-2 font-bold">{meses[m - 1]} {y}</div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => <div key={i} className="text-muted-foreground">{d}</div>)}
              {Array.from({ length: first }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: dias }).map((_, i) => {
                const iso = `${y}-${String(m).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
                const fora = iso < periodo.inicio || iso > periodo.fim;
                const j = mapa.get(iso);
                const cls = j === undefined ? (fora ? "text-muted-foreground/40" : "") : j ? "bg-justified text-primary-foreground font-bold" : "bg-late text-primary-foreground font-bold";
                return <div key={iso} className={`rounded-md py-1 ${cls}`} title={j === undefined ? "" : j ? "Atraso justificado" : "Atraso sem justificativa"}>{i + 1}</div>;
              })}
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-4 text-sm sm:col-span-full">
        <span className="flex items-center gap-2"><span className="size-3 rounded bg-late" /> Sem justificativa</span>
        <span className="flex items-center gap-2"><span className="size-3 rounded bg-justified" /> Justificado</span>
      </div>
    </div>
  );
}
