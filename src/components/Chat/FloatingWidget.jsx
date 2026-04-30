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

  // Durante el replay de autoLoad, RCB re-ejecuta el último step del flow.
  // Bloqueamos esa ejecución para no duplicar llamadas a la API.
  const isReplayingRef = useRef(true);

  const wp = window.ChatBotConfig || {};
  const txtRefinar = wp.refineBtnText || "Seguir afinando";
  const txtVer = wp.viewBtnText || "Ver resultados";

  const { handleBotMessage, getPiezas } = useBotLogic();
  useChatDOMInjector(mounted, getPiezas, wp);

  const { lastSearchRef, isLockedRef, justUnlockedVerRef, setLock } =
    useBotMemory();

  // Guardamos la respuesta de texto del backend para pasársela al GridPiezas.
  // Así mostramos el texto DENTRO del componente, no como burbuja separada arriba.
  const ultimaRespuestaRef = useRef("");
  // true solo cuando la respuesta actual tiene piezas — evita repintar el grid en mensajes conversacionales
  const respuestaTienePiezasRef = useRef(false);

  useEffect(() => {
    gestionarSesionChat();
    sanitizeChatHistory();
    setMounted(true);

    // 500ms de margen para que RCB complete el replay del historial
    const timer = setTimeout(() => {
      isReplayingRef.current = false;
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // ── Settings ──────────────────────────────────────────────────────────────
  const finalSettings = useMemo(() => {
    const isMobile = window.innerWidth < MOBILE_BP;
    const settings = buildSettings(buildConfig(wp), isMobile);
    return {
      ...settings,
      chatHistory: {
        ...settings?.chatHistory,
        storageKey: STORAGE_KEY,
        autoLoad: true,
        disabled: false,
        showChatHistory: false,
        maxEntries: 200,
      },
    };
  }, [wp]);

  // ── Estilos ───────────────────────────────────────────────────────────────
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

  // ── Handlers ──────────────────────────────────────────────────────────────

  // Modo FREE con cerrojo activo: el usuario debe pulsar un botón para continuar
  const handleLockedState = (txt) => {
    if (txt === txtRefinar) {
      setLock(false);
      justUnlockedVerRef.current = false;
      const query =
        getPiezas(lastSearchRef.current)?.metadata?.queryLimpia ||
        lastSearchRef.current;
      return `Actualmente buscando: **${query}**. Coméntame otros detalles para afinar la búsqueda como: marca, modelo, version, referencia...`;
    }
    if (txt === txtVer) {
      setLock(false);
      justUnlockedVerRef.current = true;
      return "Aquí tienes algunas opciones. Puedes ver el resto en la tienda:";
    }
    return "Por favor, elige una de las opciones para continuar.";
  };

  // Búsqueda estándar: llama al backend y gestiona el resultado
  const handleFreeSearch = async (txt, params) => {
    const prevSearch = lastSearchRef.current;
    respuestaTienePiezasRef.current = false; // Reseteamos en cada llamada
    localStorage.removeItem(PIEZAS_KEY);

    const respuestaBackend = await handleBotMessage(params, wp);

    const textoRespuesta =
      typeof respuestaBackend === "string"
        ? respuestaBackend
        : respuestaBackend.texto;
    const llaveMemoria =
      typeof respuestaBackend === "string" ? txt : respuestaBackend.llave;

    lastSearchRef.current = llaveMemoria;
    ultimaRespuestaRef.current = textoRespuesta;

    const resultado = getPiezas(llaveMemoria);
    const piezasDespues = resultado?.piezas?.length ?? 0;

    // Piezas "nuevas" = llave distinta a la búsqueda anterior, o más resultados que antes
    const piezasAntes = getPiezas(prevSearch)?.piezas?.length ?? 0;
    const sonPiezasNuevas =
      piezasDespues > 0 &&
      (llaveMemoria !== prevSearch || piezasDespues > piezasAntes);

    // Sin resultados → rollback al contexto anterior
    if (!piezasDespues) {
      const esErrorOStock =
        !textoRespuesta ||
        textoRespuesta === wp.mensajeSinStock ||
        textoRespuesta === "";

      if (esErrorOStock) {
        lastSearchRef.current = prevSearch;
        const contextoAcumulado =
          getPiezas(prevSearch)?.metadata?.queryLimpia || prevSearch;
        const msgError =
          textoRespuesta ||
          wp.mensajeSinStock ||
          "No he encontrado resultados.";
        return `${msgError}\n\n*(Búsqueda actual para refinar: **${contextoAcumulado}**)*`;
      }
      return textoRespuesta;
    }

    // Con resultados → cerrojo solo en FREE si excede límite
    if (!ES_PREMIUM && resultado.metadata?.excedeLimite) {
      setLock(true);
    }

    // Piezas nuevas reales → mostramos el grid
    if (sonPiezasNuevas) {
      respuestaTienePiezasRef.current = true;
      return null; // El texto va dentro del component, debajo del grid
    }

    // Mismas piezas de antes (contexto reciclado, ej: "gracias") → solo texto
    return textoRespuesta;
  };

  // ── Flow ──────────────────────────────────────────────────────────────────
  const flow = useMemo(
    () => ({
      start: {
        id: "start",
        message: () => {
          // Si hay cerrojo activo (sesión anterior en FREE), recordamos al usuario
          if (isLockedRef.current && !ES_PREMIUM) {
            return "Tenías una búsqueda pendiente. Por favor, elige una opción para continuar:";
          }
          // Si hay historial, el saludo no hace falta
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
          // Guard de replay: bloqueamos durante los primeros 500ms
          if (!params.userInput?.trim() || isReplayingRef.current) return null;

          const txt = params.userInput.trim();

          // Modo FREE con cerrojo: el usuario debe elegir botón
          if (isLockedRef.current && !ES_PREMIUM) {
            return handleLockedState(txt);
          }

          // Escudo contra clics residuales en botones antiguos
          if (txt === txtRefinar || txt === txtVer) return null;

          // Búsqueda normal — devuelve null si hay piezas (el texto va en GridPiezas)
          return await handleFreeSearch(txt, params);
        },

        options: () => {
          if (isReplayingRef.current) return [];
          // Opciones solo cuando el cerrojo está activo en FREE
          return isLockedRef.current && !ES_PREMIUM ? [txtRefinar, txtVer] : [];
        },

        component: (params) => {
          if (isReplayingRef.current) return null;

          const txt = params.userInput?.trim();

          // Caso FREE: usuario pulsó "Ver resultados"
          if (!ES_PREMIUM && justUnlockedVerRef.current && txt === txtVer) {
            justUnlockedVerRef.current = false;
            const res = getPiezas(lastSearchRef.current);
            if (!res?.piezas?.length) return null;
            return (
              <div className="neto-grid-vivo w-full">
                <GridPiezas piezas={res.piezas} metadata={res.metadata} />
                {ultimaRespuestaRef.current && (
                  <div
                    style={{
                      display: "inline-block",
                      maxWidth: "80%",
                      marginTop: "8px",
                      padding: "12px",
                      backgroundColor: wp.botBubbleBg || "#f0f2f5",
                      color: wp.botTextColor || "#000000",
                      borderRadius: "15px 15px 15px 2px",
                      fontSize: "14px",
                      lineHeight: "1.5",
                      wordBreak: "break-word",
                    }}
                  >
                    {ultimaRespuestaRef.current}
                  </div>
                )}
              </div>
            );
          }

          // Caso normal: solo pintamos si esta respuesta concreta trajo piezas
          const res = getPiezas(lastSearchRef.current);
          if (
            respuestaTienePiezasRef.current &&
            res?.piezas?.length > 0 &&
            (!isLockedRef.current || ES_PREMIUM)
          ) {
            return (
              <div className="neto-grid-vivo w-full">
                <GridPiezas piezas={res.piezas} metadata={res.metadata} />
                {ultimaRespuestaRef.current && (
                  <div
                    style={{
                      display: "inline-block",
                      maxWidth: "80%",
                      marginTop: "8px",
                      padding: "12px",
                      backgroundColor: wp.botBubbleBg || "#f0f2f5",
                      color: wp.botTextColor || "#000000",
                      borderRadius: "15px 15px 15px 2px",
                      fontSize: "14px",
                      lineHeight: "1.5",
                      wordBreak: "break-word",
                    }}
                  >
                    {ultimaRespuestaRef.current}
                  </div>
                )}
              </div>
            );
          }

          return null;
        },

        path: "waitInput",
      },
    }),
    [
      wp,
      getPiezas,
      handleBotMessage,
      txtRefinar,
      txtVer,
      isLockedRef,
      justUnlockedVerRef,
      lastSearchRef,
    ],
  );

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: MAX_Z_INDEX }}
    >
      <div
        className="contents pointer-events-auto"
        style={{
          "--opt-bg": wp.optionsBtnBg || "#ffffff",
          "--opt-color": wp.optionsBtnColor || "#333333",
          "--opt-border": wp.optionsBtnBorder || "#e5e7eb",
          "--opt-hover-bg": wp.optionsBtnHoverBg || "#f3f4f6",
        }}
      >
        <ChatBot settings={finalSettings} styles={finalStyles} flow={flow} />
      </div>
    </div>,
    document.body,
  );
};

export default FloatingWidget;
