import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import ChatBot from "react-chatbotify";
import {
  MOBILE_BP,
  MAX_Z_INDEX,
  STORAGE_KEY,
  SESSION_KEY,
  PIEZAS_KEY,
  CONTEXT_KEY,
  buildConfig,
  buildStyles,
  buildSettings,
  BOT_AVATAR_URL
} from "../../chatbot.config";
import { useBotLogic } from "../../hooks/botLogic";
import { useChatDOMInjector } from "../../hooks/useChatDOMInjector";
import { useBotMemory } from "../../hooks/useBotMemory";
import { useMobileKeyboardFix } from "../../hooks/useMobileKeyboardFix";
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
// Tamaño de botones según chatSize de WordPress
const HEADER_BTN_SIZE  = { small: 36, medium: 42, large: 50 };
const HEADER_ICON_SIZE = { small: 20, medium: 24, large: 29 };

const CustomHeader = ({
  title, avatar, headerTitleColor,
  onReset, onClose,
  newConvBg, newConvColor, newConvHoverBg, newConvEnabled, newConvTooltip,
  chatSize,
}) => {
  const [isOnline, setIsOnline] = useState(true);
  const [resetHovered, setResetHovered] = useState(false);
  const [closeHovered, setCloseHovered] = useState(false);
  const [showResetTip, setShowResetTip] = useState(false);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const chatUrl = window.ChatBotConfig?.backendUrl || import.meta.env.VITE_API_URL || "http://localhost:4000/api/chat";
        const healthUrl = chatUrl.replace("/chat", "/health");
        const res = await fetch(healthUrl, { method: "GET" });
        if (res.ok) {
          setIsOnline(true);
        } else {
          try {
            const data = await res.json();
            setIsOnline(typeof data?.estado === "string");
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

  const [viewportW, setViewportW] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const textColor    = headerTitleColor || "#000000";
  const colorOnline  = "#15803d";
  const colorOffline = "#b91c1c";

  const showResetBtn = newConvEnabled !== "false";
  const btnColor     = newConvColor   || "#ffffff";
  const btnHoverBg   = newConvHoverBg || "rgba(0,0,0,0.18)";
  const tipText      = newConvTooltip || "Nueva búsqueda";

  // En móvil los botones son más pequeños independientemente del chatSize de WP
  const isMobileView = viewportW < MOBILE_BP;
  const size     = isMobileView ? 36 : (HEADER_BTN_SIZE[chatSize]  || HEADER_BTN_SIZE.medium);
  const iconSize = isMobileView ? 17 : (HEADER_ICON_SIZE[chatSize] || HEADER_ICON_SIZE.medium);
  // Ancho total que ocupan los botones + hueco entre ellos
  const btnAreaW = showResetBtn ? size * 2 + 4 : size;

  const btnBase = {
    background: "transparent",
    border: "none", cursor: "pointer",
    width: `${size}px`, height: `${size}px`, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 0, margin: 0, flexShrink: 0,
    color: btnColor,
    transition: "background 0.18s ease",
  };

  return (
    // Sin position:relative → los botones con position:absolute se anclan
    // al .rcb-chat-header (que sí tiene position:relative), garantizando
    // que queden en la esquina derecha real del header, no del título.
    <div style={{
      display: "flex", alignItems: "center",
      width: "100%", boxSizing: "border-box", padding: "5px 0",
    }}>
      {/* AVATAR + BLOQUE DE TEXTO — paddingRight reserva espacio para los botones */}
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        minWidth: 0, flex: 1,
        paddingRight: `${btnAreaW + 14}px`,
      }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{
            width: "50px", height: "50px", borderRadius: "50%",
            backgroundColor: "#ffffff", border: "2px solid rgba(255,255,255,0.2)",
            overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
          }}>
            {avatar
              ? <img src={avatar} alt="Bot" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <svg viewBox="0 0 24 24" fill="#333" width="60%" height="60%"><path d="M21 11.5v-1a1.5 1.5 0 0 0-1.5-1.5H18V7a3 3 0 0 0-3-3h-6a3 3 0 0 0-3 3v2H4.5A1.5 1.5 0 0 0 3 10.5v1A1.5 1.5 0 0 0 4.5 13H6v2a3 3 0 0 0 3 3h1v2H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-2v-2h1a3 3 0 0 0 3-3v-2h1.5A1.5 1.5 0 0 0 21 11.5zm-11-2.5a1 1 0 1 1-1-1 1 1 0 0 1 1 1zm5 0a1 1 0 1 1-1-1 1 1 0 0 1 1 1zm-4 5h2a1 1 0 0 1 0 2h-2a1 1 0 0 1 0-2z" /></svg>
            }
          </div>
          <div style={{
            position: "absolute", bottom: "2px", right: "2px",
            width: "12px", height: "12px", borderRadius: "50%",
            backgroundColor: isOnline ? colorOnline : colorOffline,
            border: "2px solid #ffffff", boxShadow: "0 0 5px rgba(0,0,0,0.2)",
          }} />
        </div>

        <div style={{
          display: "flex", flexDirection: "column", justifyContent: "center",
          flex: 1, minWidth: 0, overflow: "hidden",
        }}>
          <span style={{
            fontSize: "clamp(14px, 1.1rem, 18px)", fontWeight: "800", color: textColor,
            lineHeight: "1.2", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {title || "Asistente IA"}
          </span>
          <span style={{
            fontSize: "13px", fontWeight: "400", color: textColor, opacity: 0.8,
            marginTop: "1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            Especialista en Recambios
          </span>
          <span style={{
            fontSize: "11px", fontWeight: "700",
            color: isOnline ? colorOnline : colorOffline,
            marginTop: "3px", letterSpacing: "0.05em",
          }}>
            {isOnline ? "• En línea" : "• Fuera de servicio"}
          </span>
        </div>
      </div>

      {/* BOTONES — absolutamente pegados al borde derecho del título */}
      <div style={{
        position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
        display: "flex", alignItems: "center", gap: "2px",
      }}>

        {/* Botón ↺ Nueva búsqueda */}
        {showResetBtn && (
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <button
              onClick={onReset}
              aria-label={tipText}
              style={{
                ...btnBase,
                background: resetHovered ? btnHoverBg : "transparent",
                transform: resetHovered ? "rotate(22deg)" : "rotate(0deg)",
                transition: "background 0.18s ease, transform 0.2s ease",
              }}
              onMouseEnter={() => { setResetHovered(true); setShowResetTip(true); }}
              onMouseLeave={() => { setResetHovered(false); setShowResetTip(false); }}
            >
              <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
            </button>
            {showResetTip && (
              <div style={{
                position: "absolute", right: "calc(100% + 6px)", top: "50%", transform: "translateY(-50%)",
                background: "rgba(0,0,0,0.78)", color: "#fff", fontSize: "11px", fontWeight: 500,
                padding: "4px 9px", borderRadius: "5px", whiteSpace: "nowrap", pointerEvents: "none", zIndex: 9999,
              }}>
                {tipText}
              </div>
            )}
          </div>
        )}

        {/* Botón ✕ Cerrar */}
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <button
            onClick={onClose}
            aria-label="Cerrar chat"
            style={{ ...btnBase, background: closeHovered ? btnHoverBg : "transparent" }}
            onMouseEnter={() => setCloseHovered(true)}
            onMouseLeave={() => setCloseHovered(false)}
          >
            <svg viewBox="0 0 24 24" width={iconSize + 6} height={iconSize + 6} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          {closeHovered && (
            <div style={{
              position: "absolute", right: "calc(100% + 6px)", top: "50%", transform: "translateY(-50%)",
              background: "rgba(0,0,0,0.78)", color: "#fff", fontSize: "11px", fontWeight: 500,
              padding: "4px 9px", borderRadius: "5px", whiteSpace: "nowrap", pointerEvents: "none", zIndex: 9999,
            }}>
              Cerrar chat
            </div>
          )}
        </div>

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
  const [forceClose, setForceClose] = useState(false);
  const [chatbotKey, setChatbotKey] = useState(0);
  const isReplayingRef = useRef(true);
  
  const wp = useMemo(() => window.ChatBotConfig || {}, []);
  const txtRefinar = wp.refineBtnText || "Seguir afinando";
  const txtVer = wp.viewBtnText || "Ver resultados";

  const { handleBotMessage, getPiezas } = useBotLogic();
  useChatDOMInjector(mounted, getPiezas, wp);
  useMobileKeyboardFix(isChatOpen);

  const { lastSearchRef, isLockedRef, justUnlockedVerRef, setLock } = useBotMemory();
  const sugerenciasRef = useRef([]);

  const resetConversation = useCallback(() => {
    // Limpia todo el estado persistido
    try {
      [STORAGE_KEY, SESSION_KEY, PIEZAS_KEY, CONTEXT_KEY, "NFW_LAST_SEARCH", "NFW_IS_LOCKED"]
        .forEach((k) => localStorage.removeItem(k));
    } catch (_) {}

    // Resetea los refs en memoria (el backend es stateless, contexto vacío = búsqueda nueva)
    lastSearchRef.current = "";
    isLockedRef.current = false;
    justUnlockedVerRef.current = false;
    sugerenciasRef.current = [];
    isReplayingRef.current = false;

    // Fuerza el desmontaje y remontaje de ChatBot (limpia su estado interno)
    setChatbotKey((k) => k + 1);
  }, [lastSearchRef, isLockedRef, justUnlockedVerRef, sugerenciasRef]);

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
    // Oculta el toggle flotante nativo Y el botón X nativo del header
    // (ambos los reemplazamos con nuestros propios controles React).
    style.textContent = `
      .rcb-toggle-button { visibility: hidden !important; pointer-events: none !important; }
      [class*="rcb"][class*="close"], .rcb-close-button { display: none !important; }
    `;
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

  // Agrupa los .rcb-options consecutivos (uno por opción en el DOM de react-chatbotify)
  // en un .neto-options-wrapper horizontal scrollable, y añade el hint debajo.
  useEffect(() => {
    const WRAPPER = "neto-options-wrapper";
    const HINT    = "neto-scroll-hint";
    const HINT_TXT = "← Desliza horizontalmente para ver todas las opciones →";

    const group = () => {
      // Solo .rcb-options que NO estén ya dentro de nuestro wrapper
      const loose = [...document.querySelectorAll(
        `.rcb-options:not(.${WRAPPER} > .rcb-options)`
      )];
      if (!loose.length) return;

      // Agrupar los que son hermanos consecutivos
      const groups = [];
      let current = [loose[0]];
      for (let i = 1; i < loose.length; i++) {
        // Avanza desde el final del grupo saltando nodos de texto vacíos
        let cursor = current[current.length - 1].nextSibling;
        while (cursor && cursor.nodeType === Node.TEXT_NODE && !cursor.textContent.trim()) {
          cursor = cursor.nextSibling;
        }
        if (cursor === loose[i]) {
          current.push(loose[i]);
        } else {
          groups.push(current);
          current = [loose[i]];
        }
      }
      groups.push(current);

      groups.forEach(els => {
        const wrapper = document.createElement("div");
        wrapper.className = WRAPPER;
        els[0].parentNode.insertBefore(wrapper, els[0]);
        els.forEach(el => wrapper.appendChild(el));

        // Hint debajo del wrapper
        if (!wrapper.nextElementSibling?.classList.contains(HINT)) {
          const hint = document.createElement("div");
          hint.className = HINT;
          hint.textContent = HINT_TXT;
          wrapper.insertAdjacentElement("afterend", hint);
        }
      });

      // Limpiar hints huérfanos
      document.querySelectorAll(`.${HINT}`).forEach(h => {
        if (!h.previousElementSibling?.classList.contains(WRAPPER)) h.remove();
      });
    };

    const observer = new MutationObserver(group);
    observer.observe(document.body, { childList: true, subtree: true });
    group();
    return () => {
      observer.disconnect();
      document.querySelectorAll(`.${HINT}, .${WRAPPER}`).forEach(el => {
        if (el.classList.contains(WRAPPER)) {
          // Saca las opciones del wrapper antes de eliminarlo
          [...el.children].forEach(c => el.parentNode.insertBefore(c, el));
        }
        el.remove();
      });
    };
  }, []);

  // Body Scroll Lock en móvil: cuando el chat está abierto, evitamos el scroll.
  // Usar solo overflow: hidden y depender del touchmove preventDefault en useMobileKeyboardFix
  // evita que Safari rompa los elementos con position: fixed (como la ventana del chat).
  useEffect(() => {
    if (window.innerWidth >= MOBILE_BP) return;
    if (!isChatOpen) return;

    document.documentElement.style.setProperty("overflow", "hidden", "important");
    document.body.style.setProperty("overflow", "hidden", "important");

    return () => {
      document.body.style.removeProperty("overflow");
      document.documentElement.style.removeProperty("overflow");
    };
  }, [isChatOpen]);

  // FIX: Forzamos el botón de cierre a ser grande y centrado dinámicamente
  useEffect(() => {
    const applyFix = () => {
      // 2. ARREGLO TEXTAREA: enterKeyHint hace que el teclado móvil muestre "Enviar"
      const chatWin = document.querySelector(".rcb-chat-window");
      const chatInput = chatWin?.querySelector("textarea, input[type='text']");
      if (chatInput && !chatInput.dataset.netoHint) {
        chatInput.dataset.netoHint = "true";
        chatInput.setAttribute("enterkeyhint", "send");
      }

      // 3. ARREGLO BOTÓN ENVIAR (MÓVIL)
      // react-chatbotify escucha onMouseDown en el botón de enviar (no onClick).
      // En escritorio el mousedown nativo llega a React con normalidad.
      // En móvil, al tocar el botón el navegador desenfoca el textarea (cierra
      // el teclado) ANTES de disparar el mousedown emulado. Para evitarlo:
      // - pointerdown/touchstart con preventDefault conservan el foco.
      // - En touchend despachamos un MouseEvent("mousedown") que sube por el DOM
      //   hasta los listeners de React (registrados en document.body por el portal)
      //   y dispara el onMouseDown de react-chatbotify → s() → envía el mensaje.
      // No se añade listener de 'click' para evitar bucles de recursión.
      const sendBtn = document.querySelector(".rcb-send-button");
      if (sendBtn && !sendBtn.dataset.netoFixed) {
        sendBtn.dataset.netoFixed = "true";

        let touchPending = false;

        sendBtn.addEventListener("pointerdown", (e) => {
          if (e.pointerType !== "mouse") e.preventDefault();
        }, { passive: false });

        sendBtn.addEventListener("touchstart", (e) => {
          e.preventDefault();
          touchPending = true;
        }, { passive: false });

        sendBtn.addEventListener("touchmove", () => {
          touchPending = false;
        }, { passive: true });

        sendBtn.addEventListener("touchend", (e) => {
          if (!touchPending) return;
          touchPending = false;
          e.preventDefault();
          // Despachar mousedown (el evento que react-chatbotify escucha).
          // Burbujea a document.body donde React registra sus listeners por el portal.
          sendBtn.dispatchEvent(
            new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0, buttons: 1 })
          );
        }, { passive: false });
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

    // Trackear apertura del chat sin debounce ni límites
    const wpConfig = window.ChatBotConfig || {};
    const restUrl = wpConfig.restUrl;
    const nonce = wpConfig.restNonce;

    if (restUrl && nonce) {
      fetch(restUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": nonce,
        },
        body: JSON.stringify({ action_type: "badge_open" })
      }).catch(console.error);
    }
  }, []);

  // Cierra el chat visualmente sin depender de los internos de react-chatbotify
  const handleClose = useCallback(() => setForceClose(true), []);

  // Abre el chat: si estaba forzado cerrado solo lo muestra; si estaba cerrado lo abre vía toggle
  const handleLaunch = useCallback(() => {
    if (forceClose) {
      setForceClose(false);
    } else {
      toggleChat();
    }
  }, [forceClose, toggleChat]);

  // --- CONFIGURACIÓN E INYECCIÓN EN REACT-CHATBOTIFY ---
  const finalSettings = useMemo(() => {
    const isMobile = window.innerWidth < MOBILE_BP;
    const baseSettings = buildSettings(buildConfig(wp), isMobile);
    
    baseSettings.header = {
      ...baseSettings.header,
      showAvatar: false,
      title: <CustomHeader
        title={wp.headerTitleText}
        avatar={wp.headerAvatar || BOT_AVATAR_URL}
        headerTitleColor={wp.headerTitleColor}
        onReset={resetConversation}
        onClose={handleClose}
        newConvBg={wp.newConvBg}
        newConvColor={wp.newConvColor}
        newConvHoverBg={wp.newConvHoverBg}
        newConvEnabled={wp.newConvEnabled}
        newConvTooltip={wp.newConvTooltip}
        chatSize={wp.chatSize}
      />
    };

    return baseSettings;
  }, [wp, resetConversation, handleClose]);

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

    if (textoRespuesta.includes("[[WHATSAPP]]")) {
      return textoRespuesta;
    }

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
  const chatVisible = isChatOpen && !forceClose;
  return createPortal(
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: MAX_Z_INDEX, background: (chatVisible && window.innerWidth < MOBILE_BP) ? "#ffffff" : "transparent" }}
    >
      <div className="contents pointer-events-auto" style={{
          "--opt-bg": wp.optionsBtnBg || "#ffffff",
          "--opt-color": wp.optionsBtnColor || "#111827",
          "--opt-border": wp.optionsBtnBorder || "#ffc600",
          "--opt-hover-bg": wp.optionsBtnHoverBg || "#ffc600",
          "--opt-hover-color": wp.optionsBtnHoverColor || "#111827"
      }}>
        {/* El ChatBot siempre está montado; se oculta con display:none cuando forceClose=true */}
        <div style={{ display: forceClose ? "none" : undefined }}>
          <ChatBot key={chatbotKey} settings={finalSettings} styles={finalStyles} flow={flow} />
        </div>

        {(!isChatOpen || forceClose) && (
          <PillLauncher
            toggleChat={handleLaunch}
            config={launcherConfig}
          />
        )}
      </div>
    </div>,
    document.body,
  );
};

export default FloatingWidget;