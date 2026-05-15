import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  BOT_AVATAR_URL
} from "../../chatbot.config";
import { useBotLogic } from "../../hooks/botLogic";
import { useChatDOMInjector } from "../../hooks/useChatDOMInjector";
import { useBotMemory } from "../../hooks/useBotMemory";
import {
  gestionarSesionChat,
  sanitizeChatHistory,
} from "../../utils/chatSession";
import GridPiezas from "./GridPiezas";
import PillLauncher from "./PillLauncher";

const ES_PREMIUM = import.meta.env.VITE_MODO_BOT === "PREMIUM";

// ==========================================
// COMPONENTE: CABECERA TRIPLE PISO (STOCKED)
// ==========================================
const CustomHeader = ({ title, avatar }) => {
  const [isOnline, setIsOnline] = useState(true);

  // Lógica de pulso automático
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const chatUrl = window.ChatBotConfig?.backendUrl || import.meta.env.VITE_API_URL || "http://localhost:4000/api/chat";
        const healthUrl = chatUrl.replace("/chat", "/health");
        const res = await fetch(healthUrl, { method: "GET" });
        setIsOnline(res.ok);
      } catch {
        setIsOnline(false);
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      gap: "18px", 
      width: "100%",
      // MUY IMPORTANTE: Dejamos espacio a la derecha para que el texto NO tape la "X"
      paddingRight: "45px" 
    }}>
      {/* AVATAR CIRCULAR */}
      <div style={{ position: "relative", display: "flex", flexShrink: 0 }}>
        <div style={{
          width: "52px", height: "52px", 
          borderRadius: "50%", 
          backgroundColor: "#ffffff", 
          overflow: "hidden", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          boxShadow: "0 3px 8px rgba(0,0,0,0.2)",
          border: "2.5px solid rgba(255,255,255,0.3)"
        }}>
          {avatar ? (
            <img src={avatar} alt="Bot" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#333" width="30" height="30">
               <path d="M21 11.5v-1a1.5 1.5 0 0 0-1.5-1.5H18V7a3 3 0 0 0-3-3h-6a3 3 0 0 0-3 3v2H4.5A1.5 1.5 0 0 0 3 10.5v1A1.5 1.5 0 0 0 4.5 13H6v2a3 3 0 0 0 3 3h1v2H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-2v-2h1a3 3 0 0 0 3-3v-2h1.5A1.5 1.5 0 0 0 21 11.5zm-11-2.5a1 1 0 1 1-1-1 1 1 0 0 1 1 1zm5 0a1 1 0 1 1-1-1 1 1 0 0 1 1 1zm-4 5h2a1 1 0 0 1 0 2h-2a1 1 0 0 1 0-2z" />
            </svg>
          )}
        </div>
        {/* Puntito de luz */}
        <div style={{
          position: "absolute", bottom: "2px", right: "2px",
          width: "14px", height: "14px", borderRadius: "50%",
          backgroundColor: isOnline ? "#22c55e" : "#ef4444", 
          border: "2px solid #ffffff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.4)"
        }} />
      </div>

      {/* BLOQUE DE TEXTO EN COLUMNA (UNO ENCIMA DE OTRO) */}
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        flex: 1, 
        minWidth: 0 
      }}>
        {/* Nivel 1: Título */}
        <span style={{ 
          fontSize: "20px", 
          fontWeight: "900", 
          color: "#ffffff", 
          lineHeight: "1.1",
          letterSpacing: "-0.5px",
          whiteSpace: "nowrap" 
        }}>
          {title || "Asistente IA"}
        </span>

        {/* Nivel 2: Especialidad */}
        <span style={{ 
          fontSize: "14px", 
          fontWeight: "600", 
          color: "rgba(255, 255, 255, 0.95)", 
          lineHeight: "1.2",
          marginTop: "3px"
        }}>
          Especialista en Recambios
        </span>

        {/* Nivel 3: Estado con colores dinámicos */}
        <span style={{ 
          fontSize: "12px", 
          fontWeight: "800", 
          color: isOnline ? "#36ae62" : "#fa4747", 
          letterSpacing: "0.8px",
          marginTop: "4px",
          transition: "color 0.4s ease",
          whiteSpace: "nowrap"
        }}>
          {isOnline ? "• En línea" : "• Fuera de Servicio"}
        </span>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENTE PRINCIPAL: WIDGET DEL CHATBOT
// ==========================================
const FloatingWidget = () => {
  const [mounted, setMounted] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const isReplayingRef = useRef(true);
  
  const wp = useMemo(() => window.ChatBotConfig || {}, []);
  const txtRefinar = wp.refineBtnText || "Seguir afinando";
  const txtVer = wp.viewBtnText || "Ver resultados";

  const { handleBotMessage, getPiezas } = useBotLogic();
  useChatDOMInjector(mounted, getPiezas, wp);

  const { lastSearchRef, isLockedRef, justUnlockedVerRef, setLock } = useBotMemory();

  // --- EFECTOS DE MONTAJE Y DOM ---
  useEffect(() => {
    gestionarSesionChat();
    sanitizeChatHistory();
    setMounted(true);

    const timer = setTimeout(() => {
      isReplayingRef.current = false;
    }, 1500); 
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const style = document.createElement("style");
    style.id = "neto-hide-rcb-btn";
    style.textContent = `.rcb-toggle-button { visibility: hidden !important; pointer-events: none !important; }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  useEffect(() => {
    const check = () => {
      const btn = document.querySelector(".rcb-toggle-button");
      setIsChatOpen(btn?.classList.contains("rcb-button-hide") ?? false);
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const toggleChat = useCallback(() => {
    const hiddenBtn = document.querySelector(".rcb-toggle-button");
    if (hiddenBtn) hiddenBtn.click();
  }, []);

  // --- CONFIGURACIÓN E INYECCIÓN EN REACT-CHATBOTIFY ---
  const finalSettings = useMemo(() => {
    const isMobile = window.innerWidth < MOBILE_BP;
    const baseSettings = buildSettings(buildConfig(wp), isMobile);
    
    baseSettings.header = {
      ...baseSettings.header,
      showAvatar: false,
      title: <CustomHeader title={wp.headerTitleText} avatar={wp.headerAvatar || BOT_AVATAR_URL} />
    };

    return baseSettings;
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

  // --- LÓGICA DE CONVERSACIÓN ---
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
        path: "waitInput",
      },
    }),
    [wp, getPiezas, handleBotMessage, txtRefinar, txtVer, isLockedRef, lastSearchRef],
  );

  if (!mounted) return null;

  const launcherConfig = {
    launcherBg:         wp.launcherBg         || "#F5A623",
    launcherTitle:      wp.launcherTitle      || "Hola, soy Neto",
    launcherText:       wp.launcherText       || "¿Te ayudo a encontrar tu pieza?",
    launcherIcon:       wp.launcherIcon       || "",
    launcherArrowColor: wp.launcherArrowColor || "#000000",
  };

  // --- RENDERIZADO PRINCIPAL ---
  return createPortal(
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: MAX_Z_INDEX }}>
      <div className="contents pointer-events-auto" style={{
          "--opt-bg": wp.optionsBtnBg || "#ffffff",
          "--opt-color": wp.optionsBtnColor || "#333333",
          "--opt-border": wp.optionsBtnBorder || "#e5e7eb",
          "--opt-hover-bg": wp.optionsBtnHoverBg || "#f3f4f6",
      }}>
        <ChatBot settings={finalSettings} styles={finalStyles} flow={flow} />

        {!isChatOpen && (
          <PillLauncher
            toggleChat={toggleChat}
            config={launcherConfig}
          />
        )}
      </div>
    </div>,
    document.body,
  );
};

export default FloatingWidget;