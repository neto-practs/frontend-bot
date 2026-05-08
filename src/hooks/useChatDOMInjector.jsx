import { useEffect, useRef, useCallback } from "react";
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
  const wpRef = useRef(wp);

  useEffect(() => {
    wpRef.current = wp;
  }, [wp]);

  const inyectarHistorico = useCallback(() => {
    const bubbles = document.querySelectorAll(".rcb-bot-message");
    
    bubbles.forEach((bubble) => {
      const fullText = bubble.textContent?.trim() || "";

      if (fullText === "[object Object]") {
        bubble.style.display = "none";
        return;
      }

      if (!fullText.includes("[[PIEZAS:")) return;

      if (bubble.dataset.netoInjected === "true") return;
      bubble.dataset.netoInjected = "true";

      const match = fullText.match(/\[\[PIEZAS:(.*?)\]\]/);
      if (!match) return;

      const keyword = match[1].trim();
      const botText = fullText.split("]]").slice(1).join("]]").trim();

      const resultado = getPiezas(keyword);
      if (!resultado?.piezas?.length) return;

      // 1. Dejamos que la burbuja original se encargue de mostrar solo el texto del bot.
      bubble.textContent = botText;
      
      // 2. Si el bot no tiene texto que decir, ocultamos la burbuja para que no quede vacía.
      if (!botText) {
          bubble.style.display = 'none';
      }

      const container = bubble.closest(".rcb-bot-message-container");
      if (!container) return;

      const yaInyectado = container.previousElementSibling?.classList.contains("neto-pieza-inyectada");
      
      if (!yaInyectado) {
        // 3. Creamos un div para las piezas.
        const cajaLimpia = document.createElement("div");
        cajaLimpia.className = "neto-pieza-inyectada w-full mb-1";
        
        // 4. LO CLAVE: Insertamos las piezas JUSTO ANTES de la burbuja del texto, 
        // pero DENTRO del mismo contenedor general donde se pone el nombre.
        container.parentNode.insertBefore(cajaLimpia, container);

        const root = createRoot(cajaLimpia);
        const { piezas, metadata } = resultado;

        // Renderizamos SOLO las fotos, no el texto
        root.render(
            <GridPiezas piezas={piezas} metadata={metadata} wp={wpRef.current} />
        );

        rootsRef.current.set(cajaLimpia, { root, piezas, metadata });
        container.classList.add("es-grid-de-piezas");
      }
    });
  }, [getPiezas]);

  const reordenarGridsVivos = useCallback(() => {
    document.querySelectorAll(".neto-grid-vivo").forEach((grid) => {
      const parent = grid.parentNode;
      if (!parent) return;

      let siguiente = grid.nextElementSibling;
      while (siguiente && !siguiente.classList.contains("rcb-bot-message-container")) {
        siguiente = siguiente.nextElementSibling;
      }
      
      if (!siguiente) {
        let anterior = grid.previousElementSibling;
        while (anterior && !anterior.classList.contains("rcb-bot-message-container")) {
          anterior = anterior.previousElementSibling;
        }

        if (anterior) {
          grid.classList.add("mb-2");
          anterior.parentNode.insertBefore(grid, anterior);
        }
      }
    });
  }, []);

  const ejecutarInyeccion = useCallback(() => {
    if (!mounted) return;

    inyectarHistorico();
    reordenarGridsVivos();

    limpiarEtiquetasHuerfanas();
    const config = wpRef.current;
    inyectarBotonEnviar(config.sendBtnBg || config.headerBg || "#99c355");
    procesarBurbujas(".rcb-bot-message", true, config);
    procesarBurbujas(".rcb-user-message", false, config);
  }, [mounted, inyectarHistorico, reordenarGridsVivos]);

  useEffect(() => {
    if (!mounted) return;

    let timer = null;
    const programar = () => {
      clearTimeout(timer);
      timer = setTimeout(ejecutarInyeccion, 50);
    };

    observerRef.current = new MutationObserver(programar);
    observerRef.current.observe(document.body, { childList: true, subtree: true });
    
    ejecutarInyeccion();

    return () => {
      clearTimeout(timer);
      observerRef.current?.disconnect();
    };
  }, [mounted, ejecutarInyeccion]);

  useEffect(() => {
    if (!mounted || !wp) return;

    rootsRef.current.forEach(({ root, piezas, metadata }) => {
      root.render(
          <GridPiezas piezas={piezas} metadata={metadata} wp={wp} />
      );
    });

    inyectarBotonEnviar(wp.sendBtnBg || wp.headerBg || "#99c355");
  }, [wp, mounted]);

  useEffect(() => {
    return () => {
      rootsRef.current.forEach((info) => info.root.unmount());
      rootsRef.current.clear();
    };
  }, []);
};