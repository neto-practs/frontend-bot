import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import ChatBot from "react-chatbotify";
import {
  MOBILE_BP,
  MAX_Z_INDEX,
  STORAGE_KEY,
  PIEZAS_KEY,
  buildConfig,
  buildStyles,
  buildSettings,
} from "../../chatbot.config";
import { useBotLogic } from "../../hooks/botLogic";
import { useChatDOMInjector } from "../../hooks/useChatDOMInjector";
import { useBotMemory } from "../../hooks/useBotMemory";
import {
  gestionarSesionChat,
  sanitizeChatHistory,
} from "../../utils/chatSession";
import GridPiezas from "./GridPiezas";

const ES_PREMIUM = import.meta.env.VITE_MODO_BOT === "PREMIUM";

const FloatingWidget = () => {
  const [mounted, setMounted] = useState(false);
  const isReplayingRef = useRef(true);

  const wp = window.ChatBotConfig || {};
  const txtRefinar = wp.refineBtnText || "Seguir afinando";
  const txtVer = wp.viewBtnText || "Ver resultados";

  const { handleBotMessage, getPiezas } = useBotLogic();
  useChatDOMInjector(mounted, getPiezas, wp);

  const { lastSearchRef, isLockedRef, justUnlockedVerRef, setLock } =
    useBotMemory();

  useEffect(() => {
    gestionarSesionChat();
    sanitizeChatHistory();
    setMounted(true);

    const timer = setTimeout(() => {
      isReplayingRef.current = false;
    }, 1500); // 1.5s para asegurar que el historial se cargue bien
    return () => clearTimeout(timer);
  }, []);

  const finalSettings = useMemo(() => {
    const isMobile = window.innerWidth < MOBILE_BP;
    return buildSettings(buildConfig(wp), isMobile);
  }, [wp]);

  const finalStyles = useMemo(() => {
    const isMobile = window.innerWidth < MOBILE_BP;
    const base = buildStyles(buildConfig(wp), isMobile);
    return {
      ...base,
      chatWindowStyle: {
        ...base?.chatWindowStyle,
        boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
        border: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
        overflow: "hidden",
      },
    };
  }, [wp]);

  const handleLockedState = (txt) => {
    if (txt === txtRefinar) {
      setLock(false);
      justUnlockedVerRef.current = false;
      const query = getPiezas(lastSearchRef.current)?.metadata?.queryLimpia || lastSearchRef.current;
      return `Actualmente buscando: **${query}**. Coméntame otros detalles para afinar la búsqueda como: marca, modelo, version, referencia...`;
    }
    if (txt === txtVer) {
      setLock(false);
      justUnlockedVerRef.current = true;
      return "Aquí tienes algunas opciones. Puedes ver el resto en la tienda:";
    }
    return "Por favor, elige una de las opciones para continuar.";
  };

  const handleFreeSearch = async (txt, params) => {
    const prevSearch = lastSearchRef.current;
    const respuestaBackend = await handleBotMessage(params, wp);

    const textoRespuesta = typeof respuestaBackend === "string" ? respuestaBackend : respuestaBackend.texto;
    const llaveMemoria = typeof respuestaBackend === "string" ? txt : respuestaBackend.llave;

    lastSearchRef.current = llaveMemoria;
    const resultado = getPiezas(llaveMemoria);
    const piezasDespues = resultado?.piezas?.length ?? 0;

    if (!piezasDespues) {
      if (!textoRespuesta || textoRespuesta === wp.mensajeSinStock || textoRespuesta === "") {
        lastSearchRef.current = prevSearch;
        const query = getPiezas(prevSearch)?.metadata?.queryLimpia || prevSearch;
        const msgError = textoRespuesta || wp.mensajeSinStock || "No he encontrado resultados.";
        return `${msgError}\n\n*(Búsqueda actual: **${query}**)*`;
      }
      return textoRespuesta;
    }

    if (!ES_PREMIUM && resultado.metadata?.excedeLimite) setLock(true);

    // ESTRATEGIA UNIFICADA: Todo va por marcador para persistencia perfecta.
    // Combinamos el marcador y el texto en un solo mensaje. El inyector los separará.
    return `[[PIEZAS:${llaveMemoria}]] ${textoRespuesta || ""}`;
  };

  const flow = useMemo(
    () => ({
      start: {
        id: "start",
        message: () => {
          if (isLockedRef.current && !ES_PREMIUM) return "Tenías una búsqueda pendiente. Por favor, elige una opción para continuar:";
          try {
            const hist = localStorage.getItem(STORAGE_KEY);
            if (hist && JSON.parse(hist).length > 0) return null;
          } catch (_) {}
          return wp.welcomeMessage || "Buenas, ¿puedo ayudarle?";
        },
        path: "waitInput",
      },
      waitInput: {
        id: "waitInput",
        message: async (params) => {
          if (!params.userInput?.trim() || isReplayingRef.current) return null;
          const txt = params.userInput.trim();
          if (isLockedRef.current && !ES_PREMIUM) return handleLockedState(txt);
          if (txt === txtRefinar || txt === txtVer) return null;
          return await handleFreeSearch(txt, params);
        },
        options: () => {
          if (isReplayingRef.current) return [];
          return isLockedRef.current && !ES_PREMIUM ? [txtRefinar, txtVer] : [];
        },
        // ELIMINADO 'component': Ahora el injector maneja todo vía marcadores.
        // Esto elimina las repeticiones (Triples).
        path: "waitInput",
      },
    }),
    [wp, getPiezas, handleBotMessage, txtRefinar, txtVer, isLockedRef, lastSearchRef],
  );

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: MAX_Z_INDEX }}>
      <div className="contents pointer-events-auto" style={{
          "--opt-bg": wp.optionsBtnBg || "#ffffff",
          "--opt-color": wp.optionsBtnColor || "#333333",
          "--opt-border": wp.optionsBtnBorder || "#e5e7eb",
          "--opt-hover-bg": wp.optionsBtnHoverBg || "#f3f4f6",
      }}>
        <ChatBot settings={finalSettings} styles={finalStyles} flow={flow} />
      </div>
    </div>,
    document.body,
  );
};

export default FloatingWidget;
