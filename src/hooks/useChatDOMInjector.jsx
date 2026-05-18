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
    // Solo buscamos burbujas que no hayamos inyectado con piezas aún
    const bubbles = document.querySelectorAll(".rcb-bot-message:not([data-neto-pieces-injected])");
    
    bubbles.forEach((bubble) => {
      const fullText = bubble.textContent?.trim() || "";

      if (fullText === "[object Object]") {
        bubble.style.setProperty("display", "none", "important");
        return;
      }

      if (!fullText.includes("[[PIEZAS:")) return;

      // Marcamos esta burbuja nativa como procesada por nuestro inyector de piezas
      bubble.dataset.netoPiecesInjected = "true";

      const match = fullText.match(/\[\[PIEZAS:(.*?)\]\]/);
      if (!match) return;

      const keyword = match[1].trim();
      const botText = fullText.split("]]").slice(1).join("]]").trim();

      const resultado = getPiezas(keyword);
      if (!resultado?.piezas?.length) return;

      // 1. Limpiamos el texto de la burbuja nativa (quitamos la etiqueta de la IA)
      bubble.innerHTML = botText;
      if (!botText) {
        bubble.style.display = "none";
      }

      // 2. CREAMOS UNA ENVOLTURA (WRAPPER) PARA AGRUPAR BURBUJA + PIEZAS
      const wrapper = document.createElement("div");
      wrapper.className = "flex flex-col w-full min-w-0";
      wrapper.style.gap = "8px"; // Separación entre la burbuja y el grid de piezas

      // Insertamos el wrapper justo donde estaba la burbuja
      bubble.parentNode.insertBefore(wrapper, bubble);
      
      // Movemos la burbuja NATIVA dentro de nuestro wrapper
      // ¡Esto mantiene los avatares, nombres y estilos 100% originales!
      wrapper.appendChild(bubble);

      // 3. CREAMOS LA CAJA DE PIEZAS Y LA PONEMOS DEBAJO
      const cajaPiezas = document.createElement("div");
      cajaPiezas.className = "w-full pb-2";
      wrapper.appendChild(cajaPiezas);

      // 4. Renderizamos el componente React
      const root = createRoot(cajaPiezas);
      const { piezas, metadata } = resultado;
      root.render(<GridPiezas piezas={piezas} metadata={metadata} wp={wpRef.current} />);
      
      rootsRef.current.set(cajaPiezas, { root, piezas, metadata });
    });
  }, [getPiezas]);

  const ejecutarInyeccion = useCallback(() => {
    if (!mounted) return;
    
    const config = wpRef.current;
    
    // 🌟 ORDEN MUY IMPORTANTE:
    // Primero dejamos que "chatLabels" procese los nombres nativos
    procesarBurbujas(".rcb-bot-message", true, config);
    procesarBurbujas(".rcb-user-message", false, config);

    // Segundo, envolvemos la burbuja nativa y le metemos las piezas debajo
    inyectarHistorico();

    limpiarEtiquetasHuerfanas();
    inyectarBotonEnviar(config.sendBtnBg || "#ffc600");
  }, [mounted, inyectarHistorico]);

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
  }, [wp, mounted]);

  useEffect(() => {
    return () => {
      rootsRef.current.forEach((info) => info.root.unmount());
      rootsRef.current.clear();
    };
  }, []);
};