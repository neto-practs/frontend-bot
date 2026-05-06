import { useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import GridPiezas from "../components/Chat/GridPiezas";
import {
  limpiarEtiquetasHuerfanas,
  inyectarBotonEnviar,
  procesarBurbujas,
} from "../components/Chat/chatLabels";

/**
 * Custom hook para inyectar componentes React en el DOM del chat (RCB).
 * Maneja la persistencia de los grids de piezas tras un F5 y el reordenamiento visual.
 */
export const useChatDOMInjector = (mounted, getPiezas, wp) => {
  const observerRef = useRef(null);
  const rootsRef = useRef(new Map());
  const wpRef = useRef(wp);

  // Sincronizamos wpRef para que el observer siempre use la última configuración
  useEffect(() => {
    wpRef.current = wp;
  }, [wp]);

  /**
   * Procesa el DOM buscando marcadores de piezas e inyecta los componentes correspondientes.
   */
  const inyectarHistorico = useCallback(() => {
    // Buscamos todas las burbujas del bot
    const bubbles = document.querySelectorAll(".rcb-bot-message");
    
    bubbles.forEach((bubble) => {
      const fullText = bubble.textContent?.trim() || "";

      // 1. Limpieza de burbujas corruptas
      if (fullText === "[object Object]") {
        bubble.style.display = "none";
        return;
      }

      // 2. Detección de marcador de piezas [[PIEZAS:keyword]]
      if (!fullText.includes("[[PIEZAS:")) return;

      // GUARD CRÍTICO: Si este nodo ya fue procesado, no inyectamos más.
      if (bubble.dataset.netoInjected === "true") return;
      bubble.dataset.netoInjected = "true";

      // Ocultamos la burbuja original
      bubble.style.display = "none";

      const match = fullText.match(/\[\[PIEZAS:(.*?)\]\]/);
      if (!match) return;

      const keyword = match[1].trim();
      // Extraemos el texto del bot que viene después del marcador (si existe)
      const botText = fullText.split("]]").slice(1).join("]]").trim();

      const resultado = getPiezas(keyword);
      if (!resultado?.piezas?.length) return;

      const container = bubble.closest(".rcb-bot-message-container");
      if (!container) return;

      // 3. Inyección del Grid de Piezas
      // Verificamos si ya hay una caja inyectada justo antes para este contenedor
      const yaInyectado = container.previousElementSibling?.classList.contains("neto-pieza-inyectada");
      
      if (!yaInyectado) {
        const cajaLimpia = document.createElement("div");
        cajaLimpia.className = "neto-pieza-inyectada w-full mb-2";
        container.parentNode.insertBefore(cajaLimpia, container);

        const root = createRoot(cajaLimpia);
        const { piezas, metadata } = resultado;

        root.render(
          <div className="flex flex-col gap-2">
            <GridPiezas piezas={piezas} metadata={metadata} wp={wpRef.current} />
            {botText && (
              <div 
                className="rcb-bot-message" 
                style={{
                  backgroundColor: wpRef.current.botBubbleBg || "#f0f2f5",
                  color: wpRef.current.botTextColor || "#000000",
                  borderRadius: "15px 15px 15px 2px",
                  padding: "12px",
                  maxWidth: "80%",
                  wordBreak: "break-word",
                  fontSize: "14px",
                  display: "inline-block",
                  alignSelf: "flex-start"
                }}
              >
                {botText}
              </div>
            )}
          </div>
        );

        rootsRef.current.set(cajaLimpia, { root, piezas, metadata, botText });
        container.classList.add("es-grid-de-piezas");
      }
    });
  }, [getPiezas]);

  /**
   * Reordena los grids que el bot renderiza en vivo para que aparezcan sobre el texto.
   */
  const reordenarGridsVivos = useCallback(() => {
    // Solo reordenamos si no estamos usando la inyección por marcadores 
    // (pero como ahora todo irá por marcadores, esto es casi legado/seguridad)
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

  /**
   * Lógica principal de ejecución del inyector
   */
  const ejecutarInyeccion = useCallback(() => {
    if (!mounted) return;

    inyectarHistorico();
    reordenarGridsVivos();

    // ── Etiquetas visuales y botón enviar ────────────────────────────────
    limpiarEtiquetasHuerfanas();
    const config = wpRef.current;
    inyectarBotonEnviar(config.sendBtnBg || config.headerBg || "#99c355");
    procesarBurbujas(".rcb-bot-message", true, config);
    procesarBurbujas(".rcb-user-message", false, config);
  }, [mounted, inyectarHistorico, reordenarGridsVivos]);

  // EFECTO 1: MutationObserver + Ejecución inicial
  useEffect(() => {
    if (!mounted) return;

    let timer = null;
    const programar = () => {
      clearTimeout(timer);
      timer = setTimeout(ejecutarInyeccion, 50);
    };

    observerRef.current = new MutationObserver(programar);
    observerRef.current.observe(document.body, { childList: true, subtree: true });
    
    // Ejecución inmediata para capturar lo ya existente al montar
    ejecutarInyeccion();

    return () => {
      clearTimeout(timer);
      observerRef.current?.disconnect();
    };
  }, [mounted, ejecutarInyeccion]);

  // EFECTO 2: Sincronización de estilos/configuraciones cuando 'wp' cambia
  useEffect(() => {
    if (!mounted || !wp) return;

    rootsRef.current.forEach(({ root, piezas, metadata, botText }) => {
      root.render(
        <div className="flex flex-col gap-2">
          <GridPiezas piezas={piezas} metadata={metadata} wp={wp} />
          {botText && (
            <div 
              className="rcb-bot-message" 
              style={{
                backgroundColor: wp.botBubbleBg || "#f0f2f5",
                color: wp.botTextColor || "#000000",
                borderRadius: "15px 15px 15px 2px",
                padding: "12px",
                maxWidth: "80%",
                wordBreak: "break-word",
                fontSize: "14px",
                display: "inline-block",
                alignSelf: "flex-start"
              }}
            >
              {botText}
            </div>
          )}
        </div>
      );
    });

    inyectarBotonEnviar(wp.sendBtnBg || wp.headerBg || "#99c355");
  }, [wp, mounted]);

  // EFECTO 3: Limpieza total al desmontar el componente (Widget)
  useEffect(() => {
    return () => {
      rootsRef.current.forEach((info) => info.root.unmount());
      rootsRef.current.clear();
    };
  }, []);
};
