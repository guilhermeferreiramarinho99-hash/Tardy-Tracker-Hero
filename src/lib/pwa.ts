// Registro do modo sem internet.
//
// Este é o ÚNICO lugar do app que registra o arquivo de apoio ao modo offline.
// Ele se recusa a funcionar dentro do editor do Lovable, em pré-visualização,
// em iframe, em desenvolvimento ou quando a URL traz "?sw=off" — nesses
// contextos ele apenas limpa registros antigos, para nunca deixar o app
// preso a uma versão velha da tela.

const SW = "/sw.js";

function deveRecusar(): boolean {
  if (!import.meta.env.PROD) return true;
  if (window.self !== window.top) return true; // dentro de iframe (pré-visualização)

  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return true;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;

  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

async function limparRegistrosAntigos() {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL ?? r.installing?.scriptURL ?? r.waiting?.scriptURL ?? "";
          return url.endsWith(SW);
        })
        .map((r) => r.unregister()),
    );
  } catch {
    // nada a limpar
  }
}

export async function registrarModoOffline() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  if (deveRecusar()) {
    await limparRegistrosAntigos();
    return;
  }

  try {
    await navigator.serviceWorker.register(SW, { scope: "/" });
  } catch {
    // Sem o apoio, o app continua funcionando normalmente com internet.
  }
}
