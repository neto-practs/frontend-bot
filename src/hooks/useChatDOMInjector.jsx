import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import GridPiezas from "../components/Chat/GridPiezas";
import {
  limpiarEtiquetasHuerfanas,
  inyectarBotonEnviar,
  procesarBurbujas,
} from "../components/Chat/chatLabels";

export const useChatDOMInjector = (mounted, getPiezas, wp) => {
  const observerRef = useRef(null);
  const rootsRef = useRef(new Map());

  useEffect(() => {
    if (!mounted) return;

    let timer = null;

    const ejecutarInyeccion = () => {
      // ── 1. HISTORIAL: reconstruye grids al recargar página ──────────────────
      // Al hacer F5, RCB restaura los mensajes con el marcador [[PIEZAS:keyword]]
      // en vez del componente React (no serializable). Aquí los convertimos de vuelta.
      document.querySelectorAll(".rcb-bot-message").forEach((bubble) => {
        const text = bubble.textContent?.trim() || "";

        // Ocultar burbujas corruptas
        if (text === "[object Object]") {
          bubble.style.display = "none";
          return;
        }

        if (!text.includes("[[PIEZAS:")) return;

        // Ocultamos la burbuja con el marcador — no queremos que el usuario lo vea
        bubble.style.display = "none";
        if (bubble.dataset.piezasRendered) return;

        const match = text.match(/\[\[PIEZAS:(.*?)\]\]/);
        if (!match) return;

        const keyword = match[1].trim();
        const resultado = getPiezas(keyword);
        if (!resultado?.piezas?.length) return;

        bubble.dataset.piezasRendered = "true";

        const container = bubble.closest(".rcb-bot-message-container");
        if (container) container.classList.add("es-grid-de-piezas");

        // Insertamos el grid justo antes del contenedor de la burbuja
        const yaInyectado = container?.previousElementSibling?.classList.contains("neto-pieza-inyectada");
        if (container && !yaInyectado) {
          const cajaLimpia = document.createElement("div");
          cajaLimpia.className = "neto-pieza-inyectada w-full mb-2";
          container.parentNode.insertBefore(cajaLimpia, container);

          const root = createRoot(cajaLimpia);
          root.render(
            <GridPiezas piezas={resultado.piezas} metadata={resultado.metadata} />,
          );
          rootsRef.current.set(cajaLimpia, root);
        }
      });

      // ── 2. CHAT EN VIVO: sube el grid por encima del texto del bot ──────────
      // RCB renderiza siempre: [texto bot] → [grid]
      // Queremos:               [grid]     → [texto bot]
      //
      // Estrategia: cada grid busca su burbuja de texto hermana (siguiente o anterior)
      // y si está por encima en el DOM, la movemos debajo del grid.
      document.querySelectorAll(".neto-grid-vivo").forEach((grid) => {
        const parent = grid.parentNode;
        if (!parent) return;

        // Buscamos el contenedor de burbuja bot que está justo después del grid
        let siguiente = grid.nextElementSibling;
        while (siguiente && !siguiente.classList.contains("rcb-bot-message-container")) {
          siguiente = siguiente.nextElementSibling;
        }

        if (siguiente) {
          // La burbuja ya está debajo → correcto, no tocamos nada
          return;
        }

        // La burbuja está ANTES del grid → la movemos justo después
        let anterior = grid.previousElementSibling;
        while (anterior && !anterior.classList.contains("rcb-bot-message-container")) {
          anterior = anterior.previousElementSibling;
        }

        if (anterior) {
          grid.classList.add("mb-2");
          // Insertamos el grid ANTES de la burbuja (la burbuja queda debajo)
          anterior.parentNode.insertBefore(grid, anterior);
        }
      });

      // ── 3. Etiquetas visuales y botón enviar ────────────────────────────────
      limpiarEtiquetasHuerfanas();
      inyectarBotonEnviar(wp.sendBtnBg || wp.headerBg || "#99c355");
      procesarBurbujas(".rcb-bot-message", true, wp);
      procesarBurbujas(".rcb-user-message", false, wp);
    };

    // Debounce de 50ms — imperceptible para el usuario
    const programar = () => {
      clearTimeout(timer);
      timer = setTimeout(ejecutarInyeccion, 50);
    };

    observerRef.current = new MutationObserver(programar);
    observerRef.current.observe(document.body, { childList: true, subtree: true });
    programar();

    return () => {
      clearTimeout(timer);
      observerRef.current?.disconnect();
      // Limpiamos los roots de React que hayamos creado manualmente
      rootsRef.current.forEach((root) => root.unmount());
      rootsRef.current.clear();
    };
  }, [mounted, getPiezas, wp]);
};