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
// COMPONENTE: CABECERA CON SCALING ADAPTATIVO (cqw)
// ==========================================
const CustomHeader = ({ title, avatar }) => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const chatUrl = window.ChatBotConfig?.backendUrl || import.meta.env.VITE_API_URL || "http://localhost:4000/api/chat";
        const healthUrl = chatUrl.replace("/chat", "/health");
        const res = await fetch(healthUrl, { method: "GET" });
        // El servidor está activo si responde (200 OK ó 503 DEGRADADO).
        // Sólo marcamos offline si no hay respuesta en absoluto.
        if (res.ok) {
          setIsOnline(true);
        } else {
          // 503 con body JSON → el servidor Node funciona pero la API externa falló
          try {
            const data = await res.json();
            setIsOnline(typeof data?.estado === "string"); // tiene campo 'estado' → servidor activo
          } catch {
            setIsOnline(false);
          }
        }
      } catch {
        setIsOnline(false);
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 60000);
    return () => clearInterval(interval);
  }, []);

  // Colores más oscuros solicitados
  const colorOnline = "#15803d"; // Verde oscuro
  const colorOffline = "#b91c1c"; // Rojo oscuro

  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      gap: "12px", // Aumentado ligeramente para mejor separación
      width: "100%", 
      boxSizing: "border-box",
      // REQUISITO: padding-right de 40px para la X, y un poco de padding left
      padding: "5px 40px 5px 5px", 
    }}>
      {/* 1. AVATAR CON INDICADOR */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div style={{
          width: "50px", 
          height: "50px",
          borderRadius: "50%", 
          backgroundColor: "#ffffff", 
          border: "2px solid rgba(255,255,255,0.2)",
          overflow: "hidden", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
        }}>
          {avatar ? (
            <img src={avatar} alt="Bot" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <svg viewBox="0 0 24 24" fill="#333" width="60%" height="60%"><path d="M21 11.5v-1a1.5 1.5 0 0 0-1.5-1.5H18V7a3 3 0 0 0-3-3h-6a3 3 0 0 0-3 3v2H4.5A1.5 1.5 0 0 0 3 10.5v1A1.5 1.5 0 0 0 4.5 13H6v2a3 3 0 0 0 3 3h1v2H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-2v-2h1a3 3 0 0 0 3-3v-2h1.5A1.5 1.5 0 0 0 21 11.5zm-11-2.5a1 1 0 1 1-1-1 1 1 0 0 1 1 1zm5 0a1 1 0 1 1-1-1 1 1 0 0 1 1 1zm-4 5h2a1 1 0 0 1 0 2h-2a1 1 0 0 1 0-2z" /></svg>
          )}
        </div>
        <div style={{
          position: "absolute", 
          bottom: "2px", 
          right: "2px",
          width: "12px", 
          height: "12px",
          borderRadius: "50%", 
          backgroundColor: isOnline ? colorOnline : colorOffline, 
          border: "2px solid #ffffff",
          boxShadow: "0 0 5px rgba(0,0,0,0.2)"
        }} />
      </div>

      {/* 2. BLOQUE DE TEXTO (3 PISOS) */}
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        justifyContent: "center",
        flex: 1, 
        minWidth: 0
      }}>
        {/* Línea 1: Título */}
        <span style={{ 
          fontSize: "clamp(16px, 1.2rem, 20px)", 
          fontWeight: "800", 
          color: "#000000", 
          lineHeight: "1.2", 
          whiteSpace: "nowrap"
        }}>
          {title || "Asistente IA"}
        </span>

        {/* Línea 2: Subtítulo */}
        <span style={{ 
          fontSize: "14px", 
          fontWeight: "400", 
          color: "rgba(0, 0, 0, 0.8)", 
          marginTop: "1px",
          whiteSpace: "nowrap"
        }}>
          Especialista en Recambios
        </span>

        {/* Línea 3: Estado Dinámico */}
        <span style={{ 
          fontSize: "11px", 
          fontWeight: "700", 
          color: isOnline ? colorOnline : colorOffline, 
          marginTop: "3px", 
          letterSpacing: "0.05em"
        }}>
          {isOnline ? "• En línea" : "• Fuera de servicio"}
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
  const sugerenciasRef = useRef([]);

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

  // FIX: Forzamos el botón de cierre a ser grande y centrado dinámicamente
  useEffect(() => {
    const applyFix = () => {
      // 1. ARREGLO BOTÓN CIERRE (X)
      const selectors = [
        ".rcb-close-button", 
        "button[aria-label='Close Chat']", 
        "[class*='close-button']"
      ];
      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(btn => {
          btn.style.setProperty("position", "absolute", "important");
          btn.style.setProperty("top", "8px", "important");
          btn.style.setProperty("right", "8px", "important");
          btn.style.setProperty("width", "50px", "important");
          btn.style.setProperty("height", "50px", "important");
          btn.style.setProperty("display", "flex", "important");
          btn.style.setProperty("align-items", "center", "important");
          btn.style.setProperty("justify-content", "center", "important");
          btn.style.setProperty("z-index", "99999", "important");
          btn.style.setProperty("background", "transparent", "important");
          btn.style.setProperty("padding", "0", "important");
          btn.style.setProperty("margin", "0", "important");
          
          const svg = btn.querySelector("svg");
          if (svg) {
            svg.style.setProperty("width", "36px", "important");
            svg.style.setProperty("height", "36px", "important");
            svg.style.setProperty("margin", "0", "important");
            svg.style.setProperty("display", "block", "important");
            svg.style.setProperty("flex-shrink", "0", "important");
          }
        });
      });

      // 2. ARREGLO BOTÓN ENVIAR (Click Manual)
      const sendBtn = document.querySelector(".rcb-send-button, button[aria-label='Send Message'], [class*='send-button']");
      if (sendBtn && !sendBtn.dataset.netoFixed) {
        sendBtn.dataset.netoFixed = "true";
        sendBtn.addEventListener("click", (e) => {
          const input = document.querySelector(".rcb-chat-input, textarea, input[type='text']");
          if (input && input.value.trim() !== "") {
            // Simulamos el evento Enter para que la librería procese el envío
            const event = new KeyboardEvent("keydown", {
              key: "Enter",
              code: "Enter",
              keyCode: 13,
              which: 13,
              bubbles: true,
              cancelable: true
            });
            input.dispatchEvent(event);
          }
        });
      }
    };
    
    applyFix();
    const observer = new MutationObserver(applyFix);
    observer.observe(document.body, { childList: true, subtree: true });
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
    // Limpiamos las sugerencias de la búsqueda anterior al iniciar una nueva.
    sugerenciasRef.current = [];

    const prevSearch = lastSearchRef.current;
    const respuestaBackend = await handleBotMessage(params, wp);

    // Almacenamos temporalmente las sugerencias para renderizarlas como opciones.
    sugerenciasRef.current = typeof respuestaBackend === "object" ? (respuestaBackend.sugerencias || []) : [];

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
        
        options: (params) => {
          if (isReplayingRef.current) return [];
          if (isLockedRef.current && !ES_PREMIUM) return [txtRefinar, txtVer];
          
          // Preparamos las sugerencias dinámicas para los botones.
          const rawSugerencias = sugerenciasRef.current;
          sugerenciasRef.current = []; // Reiniciamos la memoria de sugerencias para el siguiente turno.

          // Eliminamos duplicados y restringimos la cantidad máxima de opciones mostradas.
          const uniqueSugerencias = [...new Set(rawSugerencias)].slice(0, 10);
          
          return uniqueSugerencias;
        },
        path: "waitInput",
      },
    }),
    [wp, getPiezas, handleBotMessage, txtRefinar, txtVer, isLockedRef, lastSearchRef],
  );

  if (!mounted) return null;

  const launcherConfig = {
    launcherBg:         wp.launcherBg         || "#ffc600",
    launcherTitle:      wp.launcherTitle      || "¿No encuentras tu pieza?",
    launcherText:       wp.launcherText       || "Pregúntale a la IA",
    launcherIcon:       wp.launcherIcon       || BOT_AVATAR_URL,  
    launcherArrowColor: wp.launcherArrowColor || "#000000",
  };

  // --- RENDERIZADO PRINCIPAL ---
  return createPortal(
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: MAX_Z_INDEX }}>
      <div className="contents pointer-events-auto" style={{
          "--opt-bg": wp.optionsBtnBg || "#ffffff",               
          "--opt-color": wp.optionsBtnColor || "#111827",        
          "--opt-border": wp.optionsBtnBorder || "#ffc600",      
          
          "--opt-hover-bg": wp.optionsBtnHoverBg || "#ffc600",   
          "--opt-hover-color": wp.optionsBtnHoverColor || "#111827" 
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